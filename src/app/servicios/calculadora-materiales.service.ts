import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { APP_API_URL } from '../core/api/api.config';
import { extractApiErrorMessage } from '../core/http/api-error.util';

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

@Injectable({
  providedIn: 'root'
})
export class CalculadoraMaterialesService {
  private readonly apiUrl = `${APP_API_URL}/calculadora-materiales`;

  constructor(private http: HttpClient) {}

  guardarCalculo(payload: CalculoMaterialGuardado): Observable<CalculoMaterialGuardado> {
    return this.http.post<CalculoMaterialGuardado>(this.apiUrl, payload).pipe(
      catchError(this.handleError)
    );
  }

  eliminarCalculo(calculoId: number, userCode: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${calculoId}?userCode=${encodeURIComponent(userCode)}`).pipe(
      catchError(this.handleError)
    );
  }

  obtenerHistorial(userCode: string, limit = 10): Observable<CalculoMaterialGuardado[]> {
    return this.http.get<CalculoMaterialGuardado[]>(`${this.apiUrl}/history/${encodeURIComponent(userCode)}?limit=${limit}`).pipe(
      catchError(this.handleError)
    );
  }

  obtenerUltimasTareas(userCode: string, limit = 5): Observable<TareaCalculadaResumen[]> {
    return this.http.get<TareaCalculadaResumen[]>(`${this.apiUrl}/latest-tasks/${encodeURIComponent(userCode)}?limit=${limit}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: unknown): Observable<never> {
    const errorMessage = extractApiErrorMessage(
      error,
      'No se pudo procesar el historial de la calculadora.'
    );
    return throwError(() => new Error(errorMessage));
  }
}
