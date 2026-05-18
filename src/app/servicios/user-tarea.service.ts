import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, from, map, mergeMap, Observable, of, tap, throwError } from 'rxjs';
import { APP_API_URL } from '../core/api/api.config';
import { extractApiErrorMessage } from '../core/http/api-error.util';
import { OfflineSyncService } from './offline-sync.service';
import { OfflineLocalStoreService } from './offline-local-store.service';

export interface UserTarea {
  id?: any;
  tarea: string;
  costo: number;
  area: number;
  descripcion: string;
  descuento: number;
  totalCost: number;
  clienteId: number;
  pais: string;
  rubro?: string;
  categoria?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserTareaService {
  private apiUrl = `${APP_API_URL}/user-tareas`;

  constructor(
    private http: HttpClient,
    private offlineSync: OfflineSyncService,
    private localStore: OfflineLocalStoreService
  ) {}

  getAllTareas(): Observable<UserTarea[]> {
    return this.http.get<UserTarea[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  getTareasByUserCode(userCode: string): Observable<UserTarea[]> {
    return this.http.get<UserTarea[]>(`${this.apiUrl}/by-user/${userCode}`).pipe(
      map(tareas => tareas ?? []),
      tap(tareas => {
        void this.cacheTareasByUserCode(userCode, tareas).catch(() => {});
        tareas.forEach(tarea => void this.localStore.upsertUserTarea({ ...tarea, userCode }).catch(() => {}));
      }),
      catchError(() =>
        from(this.offlineSync.getCachedUserTareas(this.userCacheKey(userCode))).pipe(
          mergeMap(cached =>
            cached
              ? of(cached as UserTarea[])
              : throwError(() => new Error('Sin conexión y sin tareas en caché para este usuario.'))
          )
        )
      )
    );
  }

  addUserTarea(userTarea: UserTarea): Observable<UserTarea> {
    const localTask = this.buildLocalTask(userTarea);

    if (!navigator.onLine) {
      return from(
        Promise.all([
          this.localStore.upsertUserTarea(localTask, 'pending'),
          this.offlineSync.addToQueue('user-tarea', 'create', localTask, this.apiUrl, 'POST')
        ])
      ).pipe(map(() => localTask));
    }

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<UserTarea>(this.apiUrl, userTarea, { headers }).pipe(
      tap(saved => void this.localStore.upsertUserTarea(saved).catch(() => {})),
      catchError(error => this.handleQueuedCreateOnNetworkFailure(error, localTask))
    );
  }

  getTareasByClienteId(clienteId: number): Observable<UserTarea[]> {
    return this.http.get<UserTarea[]>(`${this.apiUrl}/by-cliente/${clienteId}`).pipe(
      map(tareas => tareas ?? []),
      tap(tareas => {
        void this.cacheTareasByClienteId(clienteId, tareas).catch(() => {});
        // Incluir clienteId explícito para garantizar que clienteServerId quede en IDB
        tareas.forEach(tarea => void this.localStore.upsertUserTarea({ ...tarea, clienteId }).catch(() => {}));
      }),
      catchError(() =>
        from(this.offlineSync.getCachedUserTareas(this.clienteCacheKey(clienteId))).pipe(
          mergeMap(cached =>
            cached
              ? of(cached as UserTarea[])
              : throwError(() => new Error('Sin conexión y sin tareas en caché para este cliente.'))
          )
        )
      )
    );
  }

  updateUserTarea(id: number, userTarea: UserTarea): Observable<UserTarea> {
    const localTask: UserTarea = { ...userTarea, id };

    if (!navigator.onLine) {
      return this.handleOfflineUpdate(id, localTask);
    }

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<UserTarea>(`${this.apiUrl}/${id}`, userTarea, { headers }).pipe(
      tap(saved => void this.localStore.upsertUserTarea({ ...saved, id }).catch(() => {})),
      catchError(error => this.handleQueuedUpdateOnNetworkFailure(error, id, localTask))
    );
  }

  deleteUserTarea0(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  deleteAllTareasByClienteId(clienteId: number): Observable<void> {
    if (!navigator.onLine) {
      return throwError(() => new Error('Sin conexión. No es posible eliminar en masa en modo offline.'));
    }
    return this.http.delete<void>(`${this.apiUrl}/by-cliente/${clienteId}`).pipe(
      tap(() => void this.offlineSync.getCachedUserTareas(this.clienteCacheKey(clienteId))
        .then(() => this.cacheTareasByClienteId(clienteId, []))
        .catch(() => {})),
      catchError(this.handleError)
    );
  }

  deleteUserTarea(id: number): Observable<void> {
    if (!navigator.onLine) {
      return this.handleOfflineDelete(id);
    }

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => void this.localStore.markUserTareaDeleteSynced(id).catch(() => {})),
      catchError(error => this.handleQueuedDeleteOnNetworkFailure(error, id))
    );
  }

  async cacheTareasByUserCode(userCode: string, tareas: UserTarea[]): Promise<void> {
    await this.offlineSync.cacheUserTareas(this.userCacheKey(userCode), tareas);
  }

  async cacheTareasByClienteId(clienteId: number, tareas: UserTarea[]): Promise<void> {
    await this.offlineSync.cacheUserTareas(this.clienteCacheKey(clienteId), tareas);
  }

  private buildLocalTask(userTarea: UserTarea): UserTarea {
    const numericId = Number(userTarea.id);
    const localId = Number.isFinite(numericId) && numericId !== 0 ? numericId : -Date.now();
    return {
      ...userTarea,
      id: localId
    };
  }

  private userCacheKey(userCode: string): string {
    return `user:${userCode}`;
  }

  private clienteCacheKey(clienteId: number): string {
    return `cliente:${clienteId}`;
  }

  private handleOfflineUpdate(id: number, userTarea: UserTarea): Observable<UserTarea> {
    if (id < 0) {
      return from(
        this.localStore.upsertUserTarea(userTarea, 'pending').then(async () => {
          const replaced = await this.offlineSync.replacePendingCreatePayload('user-tarea', id, userTarea);
          if (!replaced) {
            await this.offlineSync.addToQueue('user-tarea', 'create', userTarea, this.apiUrl, 'POST');
          }
        })
      ).pipe(map(() => userTarea));
    }

    return from(
      Promise.all([
        this.localStore.upsertUserTarea(userTarea, 'pending'),
        this.offlineSync.addToQueue('user-tarea', 'update', userTarea, `${this.apiUrl}/${id}`, 'PUT')
      ])
    ).pipe(map(() => userTarea));
  }

  private handleOfflineDelete(id: number): Observable<void> {
    if (id < 0) {
      return from(
        Promise.all([
          this.localStore.markUserTareaDeleted(id, 'pending'),
          this.offlineSync.removePendingCreate('user-tarea', id)
        ])
      ).pipe(map(() => void 0));
    }

    return from(
      Promise.all([
        this.localStore.markUserTareaDeleted(id, 'pending'),
        this.offlineSync.addToQueue('user-tarea', 'delete', { id }, `${this.apiUrl}/${id}`, 'DELETE')
      ])
    ).pipe(map(() => void 0));
  }

  private handleQueuedCreateOnNetworkFailure(error: any, localTask: UserTarea): Observable<UserTarea> {
    if (this.isOfflineLikeError(error)) {
      return from(
        Promise.all([
          this.localStore.upsertUserTarea(localTask, 'pending'),
          this.offlineSync.addToQueue('user-tarea', 'create', localTask, this.apiUrl, 'POST')
        ])
      ).pipe(map(() => localTask));
    }
    return this.handleError(error);
  }

  private handleQueuedUpdateOnNetworkFailure(error: any, id: number, userTarea: UserTarea): Observable<UserTarea> {
    if (this.isOfflineLikeError(error)) {
      return this.handleOfflineUpdate(id, userTarea);
    }
    return this.handleError(error);
  }

  private handleQueuedDeleteOnNetworkFailure(error: any, id: number): Observable<void> {
    if (this.isOfflineLikeError(error)) {
      return this.handleOfflineDelete(id);
    }
    return this.handleError(error);
  }

  private isOfflineLikeError(error: any): boolean {
    return [0, 502, 503, 504].includes(Number(error?.status)) || !navigator.onLine;
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'Error desconocido';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = extractApiErrorMessage(error);
    }
    return throwError(() => new Error(errorMessage));
  }
}
