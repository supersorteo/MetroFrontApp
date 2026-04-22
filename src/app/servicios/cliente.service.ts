import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, from, mergeMap, Observable, of, tap, throwError, map } from 'rxjs';
import { APP_API_URL } from '../core/api/api.config';
import { extractApiErrorMessage } from '../core/http/api-error.util';
import { OfflineSyncService } from './offline-sync.service';

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
  empresaId: number;
}

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly apiUrl = `${APP_API_URL}/clientes`;

  constructor(
    private http: HttpClient,
    private offlineSync: OfflineSyncService
  ) {}

  getClienteByUserCode(userCode: string): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.apiUrl}/${userCode}`)
      .pipe(catchError(this.handleError));
  }

  getClienteById(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.apiUrl}/id/${id}`)
      .pipe(catchError(this.handleError));
  }

  getClientesByEmpresaId(empresaId: number): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.apiUrl}/by-empresa/${empresaId}`).pipe(
      tap(clientes => this.offlineSync.cacheClientes(empresaId, clientes)),
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
      return from(
        this.offlineSync.addToQueue('cliente', 'create', cliente, this.apiUrl, 'POST')
      ).pipe(map(() => ({ ...cliente, id: -Date.now() })));
    }
    return this.http.post<Cliente>(this.apiUrl, cliente)
      .pipe(catchError(this.handleError));
  }

  updateCliente(id: number, cliente: Cliente): Observable<Cliente> {
    if (!navigator.onLine) {
      return from(
        this.offlineSync.addToQueue('cliente', 'update', cliente, `${this.apiUrl}/id/${id}`, 'PUT')
      ).pipe(map(() => cliente));
    }
    return this.http.put<Cliente>(`${this.apiUrl}/id/${id}`, cliente)
      .pipe(catchError(this.handleError));
  }

  deleteCliente(id: number): Observable<void> {
    if (!navigator.onLine) {
      return from(
        this.offlineSync.addToQueue('cliente', 'delete', { id }, `${this.apiUrl}/id/${id}`, 'DELETE')
      ).pipe(map(() => void 0));
    }
    return this.http.delete<void>(`${this.apiUrl}/id/${id}`)
      .pipe(catchError(this.handleError));
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
