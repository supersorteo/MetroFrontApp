import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError, from, map, mergeMap, of, tap } from 'rxjs';
import { APP_API_URL } from '../core/api/api.config';
import { extractApiErrorMessage } from '../core/http/api-error.util';
import { OfflineSyncService } from './offline-sync.service';

export interface ResultadoMaterialGuardado {
  nombre: string;
  cantidad: number;
  icono: string;
  bolsas?: number;
  bolsasLabel?: string;
  detalleDias?: string;
}

export interface CalculoMaterialGuardado {
  id?: number;
  userCode: string;
  tareaId: number;
  tareaTitulo: string;
  categoria: string;
  unidad: string;
  valorIngresado: number;
  resultados: ResultadoMaterialGuardado[];
  createdAt?: string;
}

export interface TareaCalculadaResumen {
  tareaId: number;
  tareaTitulo: string;
  categoria: string;
  unidad: string;
  lastCalculatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class CalculadoraMaterialesService {
  private readonly apiUrl = `${APP_API_URL}/calculadora-materiales`;

  constructor(
    private http: HttpClient,
    private offlineSync: OfflineSyncService
  ) {}

  guardarCalculo(payload: CalculoMaterialGuardado): Observable<CalculoMaterialGuardado> {
    if (!navigator.onLine) {
      return from(
        this.offlineSync.addToQueue('calculo-material', 'create', payload, this.apiUrl, 'POST')
      ).pipe(map(() => ({ ...payload, id: -Date.now() })));
    }
    return this.http.post<CalculoMaterialGuardado>(this.apiUrl, payload).pipe(
      catchError(this.handleError)
    );
  }

  eliminarCalculo(calculoId: number, userCode: string): Observable<void> {
    const endpoint = `${this.apiUrl}/${calculoId}?userCode=${encodeURIComponent(userCode)}`;
    if (!navigator.onLine) {
      return from(
        this.offlineSync.addToQueue('calculo-material', 'delete', { calculoId, userCode }, endpoint, 'DELETE')
      ).pipe(map(() => void 0));
    }
    return this.http.delete<void>(endpoint).pipe(catchError(this.handleError));
  }

  obtenerHistorial(userCode: string, limit = 10): Observable<CalculoMaterialGuardado[]> {
    return this.http.get<CalculoMaterialGuardado[]>(
      `${this.apiUrl}/history/${encodeURIComponent(userCode)}?limit=${limit}`
    ).pipe(
      tap(historial =>
        this.offlineSync.cacheCalculos(userCode, historial, [])
      ),
      catchError(() =>
        from(this.offlineSync.getCachedCalculos(userCode)).pipe(
          mergeMap(cached =>
            cached ? of(cached.historial as CalculoMaterialGuardado[]) : of([])
          )
        )
      )
    );
  }

  obtenerUltimasTareas(userCode: string, limit = 5): Observable<TareaCalculadaResumen[]> {
    return this.http.get<TareaCalculadaResumen[]>(
      `${this.apiUrl}/latest-tasks/${encodeURIComponent(userCode)}?limit=${limit}`
    ).pipe(
      tap(async ultimasTareas => {
        const cached = await this.offlineSync.getCachedCalculos(userCode);
        this.offlineSync.cacheCalculos(userCode, cached?.historial ?? [], ultimasTareas);
      }),
      catchError(() =>
        from(this.offlineSync.getCachedCalculos(userCode)).pipe(
          mergeMap(cached =>
            cached ? of(cached.ultimasTareas as TareaCalculadaResumen[]) : of([])
          )
        )
      )
    );
  }

  private handleError(error: unknown): Observable<never> {
    return throwError(() => new Error(
      extractApiErrorMessage(error, 'No se pudo procesar el historial de la calculadora.')
    ));
  }
}
