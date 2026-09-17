import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { APP_API_URL } from '../core/api/api.config';
import { extractApiErrorMessage } from '../core/http/api-error.util';

export interface Provincia {
  id: number;
  nombre: string;
  indiceMo?: number;
}

export const INDICES_MANO_OBRA: Readonly<Record<string, number>> = {
  'Buenos Aires': 100,
  'Catamarca': 96,
  'Chaco': 98,
  'Chubut': 81,
  'Córdoba': 90,
  'Corrientes': 98,
  'Entre Ríos': 98,
  'Formosa': 98,
  'Jujuy': 81,
  'La Pampa': 88,
  'La Rioja': 86,
  'Mendoza': 96,
  'Misiones': 98,
  'Neuquén': 135,
  'Río Negro': 135,
  'Salta': 76,
  'San Juan': 77,
  'San Luis': 102,
  'Santa Cruz': 135,
  'Santa Fe': 98,
  'Santiago del Estero': 99,
  'Tierra del Fuego': 135,
  'Tucumán': 91,
};

@Injectable({
  providedIn: 'root'
})
export class ProvinciaService {

  //private apiUrl = 'http://localhost:8080/api/provincias';
  //private apiUrl ='https://adequate-education-production.up.railway.app/api/provincias';

  private apiUrl = `${APP_API_URL}/provincias`;


  constructor(private http: HttpClient) { }

  getAllProvincias(): Observable<Provincia[]> {
    return this.http.get<Provincia[]>(this.apiUrl) .pipe(
       catchError(this.handleError)
      );
    }


  getProvinciasByPais(pais: string): Observable<Provincia[]> {
    return this.http.get<Provincia[]>(`${this.apiUrl}/by-pais?pais=${pais}`);
  }

  getIndiceManoObra(provincia: Provincia | string | null | undefined): number {
    if (!provincia) return 100;
    if (typeof provincia !== 'string' && provincia.indiceMo != null) return provincia.indiceMo;
    const nombre = typeof provincia === 'string' ? provincia : provincia.nombre;
    return INDICES_MANO_OBRA[nombre] ?? 100;
  }

    private handleError(error: HttpErrorResponse): Observable<never> {
      const errorMessage = extractApiErrorMessage(error);
      console.error(errorMessage);
      return throwError(
        () => new Error(errorMessage)
      );
    }
}
