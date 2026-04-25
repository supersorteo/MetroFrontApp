import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, from, lastValueFrom, map, mergeMap, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { APP_API_URL } from '../core/api/api.config';
import { extractApiErrorMessage } from '../core/http/api-error.util';
import { OfflineSyncService } from './offline-sync.service';
import { OfflineLocalStoreService } from './offline-local-store.service';

export interface Empresa {
  id?: number;
  name: string;
  phone: string;
  email: string;
  description: string;
  logoUrl: string;
  userCode: string;
  website?: string;
  tiktok?: string;
  instagram?: string;
  facebook?: string;
  cuilCuit?: string;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  tableColor?: string;
  tableTextColor?: string;
  secondaryColor2?: string;
  gradientAngle?: string;
  infoBoxColorHex?: string;
  infoBoxOpacity?: number;
  tableBodyColor?: string;
}

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private readonly apiUrl = `${APP_API_URL}/empresas`;
  private readonly uploadUrl = `${APP_API_URL}/upload/image`;

  constructor(
    private http: HttpClient,
    private offlineSync: OfflineSyncService,
    private localStore: OfflineLocalStoreService
  ) {}

  getEmpresaById(id: number): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.apiUrl}/id/${id}`).pipe(
      tap(empresa => {
        void this.localStore.upsertEmpresa(empresa).catch(() => {});
        void this.cacheRemoteLogo(empresa).catch(() => {});
      }),
      catchError(() =>
        from(this.localStore.getEmpresaByLocalOrServerId(id)).pipe(
          mergeMap(cached =>
            cached
              ? of(cached as Empresa)
              : throwError(() => new Error('Sin conexion y sin datos locales para la empresa.'))
          )
        )
      )
    );
  }

  getEmpresaByUserCode(userCode: string): Observable<Empresa[]> {
    return this.http.get<Empresa | Empresa[]>(`${this.apiUrl}/${userCode}`).pipe(
      map(result => Array.isArray(result) ? result : [result]),
      tap(empresas => {
        empresas.forEach(e => {
          void this.offlineSync.cacheEmpresa(userCode, e).catch(() => {});
          void this.localStore.upsertEmpresa(e).catch(() => {});
          void this.cacheRemoteLogo(e).catch(() => {});
        });
      }),
      catchError(() =>
        from(this.localStore.listEmpresas(userCode)).pipe(
          mergeMap(cached =>
            cached.length > 0
              ? of(cached as Empresa[])
              : throwError(() => new Error('Sin conexión y sin datos en caché para la empresa.'))
          )
        )
      )
    );
  }

  saveEmpresa(empresa: Empresa): Observable<Empresa> {
    if (!navigator.onLine) {
      return this.queueCreate(empresa);
    }
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<Empresa>(this.apiUrl, empresa, { headers }).pipe(
      tap(saved => void this.localStore.upsertEmpresa(saved).catch(() => {})),
      catchError(error =>
        this.isOfflineLikeError(error)
          ? this.queueCreate(empresa)
          : this.handleError(error)
      )
    );
  }

  updateEmpresa(id: number, empresa: Empresa): Observable<Empresa> {
    if (!navigator.onLine) {
      return this.queueUpdate(id, empresa);
    }
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<Empresa>(`${this.apiUrl}/id/${id}`, empresa, { headers }).pipe(
      tap(saved => void this.localStore.upsertEmpresa({ ...saved, id }).catch(() => {})),
      catchError(error =>
        this.isOfflineLikeError(error)
          ? this.queueUpdate(id, empresa)
          : this.handleError(error)
      )
    );
  }

  deleteEmpresa(id: number): Observable<void> {
    if (!navigator.onLine) {
      return this.queueDelete(id);
    }
    return this.http.delete<void>(`${this.apiUrl}/id/${id}`).pipe(
      tap(() => void this.localStore.markEmpresaDeleteSynced(id).catch(() => {})),
      catchError(error =>
        this.isOfflineLikeError(error)
          ? this.queueDelete(id)
          : this.handleError(error)
      )
    );
  }

  uploadImage(file: File, userCode: string, empresaId?: number): Observable<string> {
    if (!navigator.onLine) {
      return this.queueLogoUpload(file, userCode, empresaId);
    }

    const formData = new FormData();
    formData.append('files', file);
    formData.append('userCode', userCode);
    return this.http.post<{ urls: string[] }>(this.uploadUrl, formData).pipe(
      map(response => response.urls[0]),
      tap(url => void this.localStore.saveImageBlob({
        file,
        ownerEntity: 'empresa-logo',
        ownerServerId: empresaId,
        userCode,
        remoteUrl: url,
        syncStatus: 'synced'
      }).catch(() => {})),
      catchError(error =>
        this.isOfflineLikeError(error)
          ? this.queueLogoUpload(file, userCode, empresaId)
          : this.handleError(error)
      )
    );
  }

  private queueCreate(empresa: Empresa): Observable<Empresa> {
    const localEmpresa = { ...empresa, id: -Date.now() };
    return from(
      Promise.all([
        this.localStore.upsertEmpresa(localEmpresa, 'pending'),
        this.offlineSync.addToQueue('empresa', 'create', localEmpresa, this.apiUrl, 'POST')
      ])
    ).pipe(map(() => localEmpresa));
  }

  private queueUpdate(id: number, empresa: Empresa): Observable<Empresa> {
    const localEmpresa = { ...empresa, id };
    if (id < 0) {
      return from(
        this.localStore.upsertEmpresa(localEmpresa, 'pending').then(async () => {
          const replaced = await this.offlineSync.replacePendingCreatePayload('empresa', id, localEmpresa);
          if (!replaced) {
            await this.offlineSync.addToQueue('empresa', 'create', localEmpresa, this.apiUrl, 'POST');
          }
        })
      ).pipe(map(() => localEmpresa));
    }

    return from(
      Promise.all([
        this.localStore.upsertEmpresa(localEmpresa, 'pending'),
        this.offlineSync.addToQueue('empresa', 'update', localEmpresa, `${this.apiUrl}/id/${id}`, 'PUT')
      ])
    ).pipe(map(() => localEmpresa));
  }

  private queueDelete(id: number): Observable<void> {
    return from(
      Promise.all([
        this.localStore.markEmpresaDeleted(id, 'pending'),
        this.offlineSync.addToQueue('empresa', 'delete', { id }, `${this.apiUrl}/id/${id}`, 'DELETE')
      ])
    ).pipe(map(() => void 0));
  }

  private queueLogoUpload(file: File, userCode: string, empresaId?: number): Observable<string> {
    return from(this.readFileAsDataUrl(file)).pipe(
      switchMap(dataUrl =>
        from(Promise.all([
          this.localStore.saveImageBlob({
            file,
            ownerEntity: 'empresa-logo',
            ownerServerId: empresaId,
            userCode,
            syncStatus: 'pending'
          }),
          this.offlineSync.queueEmpresaLogoUpload(dataUrl, userCode, empresaId)
        ])).pipe(
          map(() => dataUrl)
        )
      )
    );
  }

  private isOfflineLikeError(error: any): boolean {
    return [0, 502, 503, 504].includes(Number(error?.status)) || !navigator.onLine;
  }

  private async cacheRemoteLogo(empresa: Empresa): Promise<void> {
    const empresaId = Number(empresa?.id);
    const logoUrl = String(empresa?.logoUrl || '').trim();
    const userCode = String(empresa?.userCode || '').trim();

    if (!Number.isFinite(empresaId) || empresaId <= 0 || !logoUrl || logoUrl === '#' || logoUrl.startsWith('data:image/')) {
      return;
    }

    const alreadyCached = await this.localStore.hasEmpresaLogoBlob({
      empresaId,
      userCode,
      currentLogoUrl: logoUrl
    });
    if (alreadyCached) {
      return;
    }

    const blob = await lastValueFrom(this.http.get(logoUrl, { responseType: 'blob' }));
    if (!blob || blob.size === 0) {
      return;
    }

    const file = new File(
      [blob],
      this.resolveLogoFilename(logoUrl, empresaId),
      { type: blob.type || 'application/octet-stream' }
    );

    await this.localStore.saveImageBlob({
      file,
      ownerEntity: 'empresa-logo',
      ownerServerId: empresaId,
      userCode,
      remoteUrl: logoUrl,
      syncStatus: 'synced'
    });
  }

  private resolveLogoFilename(logoUrl: string, empresaId: number): string {
    const sanitizedUrl = logoUrl.split('#')[0].split('?')[0];
    const lastSegment = sanitizedUrl.split('/').pop() || '';
    const decodedName = this.safeDecodeURIComponent(lastSegment).trim();
    return decodedName || `logo-${empresaId}`;
  }

  private safeDecodeURIComponent(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
      reader.readAsDataURL(file);
    });
  }

  private handleError(error: any): Observable<never> {
    return throwError(() => new Error(extractApiErrorMessage(error)));
  }
}
