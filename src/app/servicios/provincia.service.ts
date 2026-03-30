import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { APP_API_URL } from '../core/api/api.config';
import { extractApiErrorMessage } from '../core/http/api-error.util';

export interface Provincia {
  id: number;
  nombre: string;
}

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

    private handleError(error: HttpErrorResponse): Observable<never> {
      const errorMessage = extractApiErrorMessage(error);
      console.error(errorMessage);
      return throwError(
        () => new Error(errorMessage)
      );
    }
}
