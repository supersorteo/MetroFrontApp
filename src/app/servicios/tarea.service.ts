import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, from, mergeMap, Observable, of, tap, throwError } from 'rxjs';

import {  shareReplay } from 'rxjs/operators';

import { APP_API_URL } from '../core/api/api.config';
import { extractApiErrorMessage } from '../core/http/api-error.util';
import { OfflineLocalStoreService } from './offline-local-store.service';



//interface Tarea { id?: number; nombre: string; costo: number; area: number; descripcion: string; descuento: number}


export interface Tarea {
  id?: number;
  tarea: string;
  costo: number;
  rubro: string;
  categoria: string;
  pais: string;
  descripcion: string;
  descuento: number;
  area: number;
  totalCost?: number;
  userCode?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TareaService {

//private apiUrl = 'http://localhost:8080/api/tareas'
//private apiUrl = 'https://adequate-education-production.up.railway.app/api/tareas';
private tareasCache = new Map<string, Observable<Tarea[]>>();

private apiUrl = `${APP_API_URL}/tareas`;


  constructor(
    private http: HttpClient,
    private localStore: OfflineLocalStoreService
  ) { }

  getTareas(): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(this.apiUrl)
    .pipe(
      catchError(this.handleError)
    );
  }

   getTareasByPais(pais: string): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(`${this.apiUrl}/by-pais?pais=${pais}`)
      .pipe(catchError(this.handleError));
  }

  getTareasByPaisCached(pais: string, force = false): Observable<Tarea[]> {
    const normalizedPais = this.normalizePais(pais);

    if (force) {
      this.tareasCache.delete(normalizedPais);
    }

    if (!force && this.tareasCache.has(normalizedPais)) {
      return this.tareasCache.get(normalizedPais)!;
    }

    const obs$ = from(this.getCachedTareasByPais(normalizedPais)).pipe(
      mergeMap(cached => {
        if (cached && cached.length > 0) {
          if (navigator.onLine) {
            this.http.get<Tarea[]>(`${this.apiUrl}/by-pais?pais=${pais}`)
              .pipe(tap(tareas => void this.persistTareasByPais(normalizedPais, tareas)))
              .subscribe({ error: () => {} });
          }
          return of(cached);
        }
        if (!navigator.onLine) return of([] as Tarea[]);
        return this.http.get<Tarea[]>(`${this.apiUrl}/by-pais?pais=${pais}`).pipe(
          tap(tareas => void this.persistTareasByPais(normalizedPais, tareas)),
          catchError(error =>
            from(this.getCachedTareasByPais(normalizedPais)).pipe(
              mergeMap(c => c && c.length > 0 ? of(c) : this.handleError(error))
            )
          )
        );
      }),
      shareReplay(1)
    );

    this.tareasCache.set(normalizedPais, obs$);
    return obs$;
  }

  agregarTarea(tarea: Tarea): Observable<Tarea> {
    return this.http.post<Tarea>(this.apiUrl, tarea)
    .pipe(
      catchError(this.handleError)
    );
  }

  actualizarTarea(id: number, tarea: Tarea): Observable<Tarea> {
    return this.http.put<Tarea>(`${this.apiUrl}/${id}`, tarea) .pipe( catchError(this.handleError) );
  }

  eliminarTarea(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`) .pipe( catchError(this.handleError) );
  }

  private handleError(error: any): Observable<never> {
    const errorMessage = extractApiErrorMessage(
      error,
      'Algo salio mal; por favor, intente nuevamente mas tarde.'
    );
    console.error('Ocurrio un error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }

  private normalizePais(pais: string): string {
    return (pais || '').trim().toLowerCase();
  }

  private tareasPaisCacheKey(pais: string): string {
    return `tareas:pais:${pais || 'sin-pais'}`;
  }

  private tareasPaisStorageKey(pais: string): string {
    return `tareasPais_${pais || 'sin-pais'}`;
  }

  private async persistTareasByPais(pais: string, tareas: Tarea[]): Promise<void> {
    const normalizedPais = this.normalizePais(pais);
    const cacheKey = this.tareasPaisCacheKey(normalizedPais);
    await this.localStore.setState(cacheKey, tareas);
    localStorage.setItem(this.tareasPaisStorageKey(normalizedPais), JSON.stringify(tareas));
  }

  private async getCachedTareasByPais(pais: string): Promise<Tarea[] | null> {
    const normalizedPais = this.normalizePais(pais);
    const cacheKey = this.tareasPaisCacheKey(normalizedPais);
    const indexed = await this.localStore.getState<Tarea[]>(cacheKey);
    if (indexed && indexed.length > 0) {
      return indexed;
    }

    try {
      const raw = localStorage.getItem(this.tareasPaisStorageKey(normalizedPais));
      return raw ? JSON.parse(raw) as Tarea[] : null;
    } catch {
      return null;
    }
  }
}


