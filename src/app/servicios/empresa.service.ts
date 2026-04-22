import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, from, map, mergeMap, Observable, of, tap, throwError } from 'rxjs';
import { APP_API_URL } from '../core/api/api.config';
import { extractApiErrorMessage } from '../core/http/api-error.util';
import { OfflineSyncService } from './offline-sync.service';

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
    private offlineSync: OfflineSyncService
  ) {}

  getEmpresaById(id: number): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.apiUrl}/id/${id}`)
      .pipe(catchError(this.handleError));
  }

  getEmpresaByUserCode(userCode: string): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.apiUrl}/${userCode}`).pipe(
      tap(empresa => this.offlineSync.cacheEmpresa(userCode, empresa)),
      catchError(() =>
        from(this.offlineSync.getCachedEmpresa(userCode)).pipe(
          mergeMap(cached =>
            cached
              ? of(cached as Empresa)
              : throwError(() => new Error('Sin conexión y sin datos en caché para la empresa.'))
          )
        )
      )
    );
  }

  saveEmpresa(empresa: Empresa): Observable<Empresa> {
    if (!navigator.onLine) {
      return from(
        this.offlineSync.addToQueue('empresa', 'create', empresa, this.apiUrl, 'POST')
      ).pipe(map(() => ({ ...empresa, id: -Date.now() })));
    }
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<Empresa>(this.apiUrl, empresa, { headers })
      .pipe(catchError(this.handleError));
  }

  updateEmpresa(id: number, empresa: Empresa): Observable<Empresa> {
    if (!navigator.onLine) {
      return from(
        this.offlineSync.addToQueue('empresa', 'update', empresa, `${this.apiUrl}/id/${id}`, 'PUT')
      ).pipe(map(() => empresa));
    }
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<Empresa>(`${this.apiUrl}/id/${id}`, empresa, { headers })
      .pipe(catchError(this.handleError));
  }

  deleteEmpresa(id: number): Observable<void> {
    if (!navigator.onLine) {
      return from(
        this.offlineSync.addToQueue('empresa', 'delete', { id }, `${this.apiUrl}/id/${id}`, 'DELETE')
      ).pipe(map(() => void 0));
    }
    return this.http.delete<void>(`${this.apiUrl}/id/${id}`)
      .pipe(catchError(this.handleError));
  }

  uploadImage(file: File, userCode: string): Observable<string> {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('userCode', userCode);
    return this.http.post<{ urls: string[] }>(this.uploadUrl, formData).pipe(
      catchError(this.handleError),
      map(response => response.urls[0])
    );
  }

  private handleError(error: any): Observable<never> {
    return throwError(() => new Error(extractApiErrorMessage(error)));
  }
}
