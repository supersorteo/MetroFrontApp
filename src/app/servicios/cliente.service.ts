import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, from, mergeMap, Observable, of, tap, throwError, map } from 'rxjs';
import { APP_API_URL } from '../core/api/api.config';
import { extractApiErrorMessage } from '../core/http/api-error.util';
import { OfflineSyncService } from './offline-sync.service';
import { OfflineLocalStoreService } from './offline-local-store.service';

export interface Cliente {
  id?: number;
  name: string;
  contact: string;
  budgetDate: string;
  additionalDetails: string;
  userCode: string;
  email: string;
  clave: string;
  direccion: string;
  empresaId?: number;
}

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly apiUrl = `${APP_API_URL}/clientes`;

  constructor(
    private http: HttpClient,
    private offlineSync: OfflineSyncService,
    private localStore: OfflineLocalStoreService
  ) {}

  getClienteByUserCode(userCode: string): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.apiUrl}/${userCode}`).pipe(
      tap(clientes => clientes.forEach(cliente => void this.localStore.upsertCliente(cliente).catch(() => {}))),
      catchError(() =>
        from(this.localStore.listClientesByUserCode(userCode)).pipe(
          mergeMap(cached =>
            cached.length > 0
              ? of(cached as Cliente[])
              : throwError(() => new Error('Sin conexion y sin clientes locales para este usuario.'))
          )
        )
      )
    );
  }

  getClienteById(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.apiUrl}/id/${id}`).pipe(
      tap(cliente => void this.localStore.upsertCliente(cliente).catch(() => {})),
      catchError(() =>
        from(this.localStore.getClienteByLocalOrServerId(id)).pipe(
          mergeMap(cached =>
            cached
              ? of(cached as Cliente)
              : throwError(() => new Error('Sin conexion y sin datos locales para el cliente.'))
          )
        )
      )
    );
  }

  getClientesByEmpresaId(empresaId: number): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.apiUrl}/by-empresa/${empresaId}`).pipe(
      tap(clientes => {
        void this.offlineSync.cacheClientes(empresaId, clientes).catch(() => {});
        clientes.forEach(cliente => void this.localStore.upsertCliente(cliente).catch(() => {}));
      }),
      catchError(() =>
        from(this.offlineSync.getCachedClientes(empresaId)).pipe(
          mergeMap(cached =>
            cached
              ? of(cached as Cliente[])
              : throwError(() => new Error('Sin conexión y sin datos en caché para los clientes.'))
          )
        )
      )
    );
  }

  saveCliente(cliente: Cliente): Observable<Cliente> {
    if (!navigator.onLine) {
      return this.queueCreate(cliente);
    }
    return this.http.post<Cliente>(this.apiUrl, cliente).pipe(
      tap(saved => void this.localStore.upsertCliente(saved).catch(() => {})),
      catchError(error =>
        this.isOfflineLikeError(error)
          ? this.queueCreate(cliente)
          : this.handleError(error)
      )
    );
  }

  updateCliente(id: number, cliente: Cliente): Observable<Cliente> {
    if (!navigator.onLine) {
      return this.queueUpdate(id, cliente);
    }
    return this.http.put<Cliente>(`${this.apiUrl}/id/${id}`, cliente).pipe(
      tap(saved => void this.localStore.upsertCliente({ ...saved, id }).catch(() => {})),
      catchError(error =>
        this.isOfflineLikeError(error)
          ? this.queueUpdate(id, cliente)
          : this.handleError(error)
      )
    );
  }

  deleteCliente(id: number): Observable<void> {
    if (!navigator.onLine) {
      return this.queueDelete(id);
    }
    return this.http.delete<void>(`${this.apiUrl}/id/${id}`).pipe(
      tap(() => void this.localStore.markClienteDeleteSynced(id).catch(() => {})),
      catchError(error =>
        this.isOfflineLikeError(error)
          ? this.queueDelete(id)
          : this.handleError(error)
      )
    );
  }

  private queueCreate(cliente: Cliente): Observable<Cliente> {
    const localCliente = { ...cliente, id: -Date.now() };
    return from(
      Promise.all([
        this.localStore.upsertCliente(localCliente, 'pending'),
        this.offlineSync.addToQueue('cliente', 'create', localCliente, this.apiUrl, 'POST')
      ])
    ).pipe(map(() => localCliente));
  }

  private queueUpdate(id: number, cliente: Cliente): Observable<Cliente> {
    const localCliente = { ...cliente, id };
    if (id < 0) {
      return from(
        this.localStore.upsertCliente(localCliente, 'pending').then(async () => {
          const replaced = await this.offlineSync.replacePendingCreatePayload('cliente', id, localCliente);
          if (!replaced) {
            await this.offlineSync.addToQueue('cliente', 'create', localCliente, this.apiUrl, 'POST');
          }
        })
      ).pipe(map(() => localCliente));
    }

    return from(
      Promise.all([
        this.localStore.upsertCliente(localCliente, 'pending'),
        this.offlineSync.addToQueue('cliente', 'update', localCliente, `${this.apiUrl}/id/${id}`, 'PUT')
      ])
    ).pipe(map(() => localCliente));
  }

  private queueDelete(id: number): Observable<void> {
    return from(
      Promise.all([
        this.localStore.markClienteDeleted(id, 'pending'),
        this.offlineSync.addToQueue('cliente', 'delete', { id }, `${this.apiUrl}/id/${id}`, 'DELETE')
      ])
    ).pipe(map(() => void 0));
  }

  private isOfflineLikeError(error: any): boolean {
    return [0, 502, 503, 504].includes(Number(error?.status)) || !navigator.onLine;
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'Error desconocido';
    if (error.status === 400 && error.error?.error) {
      errorMessage = error.error.error;
    } else {
      errorMessage = extractApiErrorMessage(error);
    }
    return throwError(() => new Error(errorMessage));
  }
}
