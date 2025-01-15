import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

interface Provincia {
  id: number;
  nombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProvinciaService {
  private apiUrl = 'http://localhost:8080/api/provincias';

  constructor(private http: HttpClient) { }

  getAllProvincias(): Observable<Provincia[]> {
    return this.http.get<Provincia[]>(this.apiUrl) .pipe(
       catchError(this.handleError)
      );
    }
    private handleError(error: HttpErrorResponse): Observable<never> {
      const errorMessage = error.error.message || 'Error desconocido';
      console.error(errorMessage);
      return throwError(
        () => new Error(errorMessage)
      );
    }
}
