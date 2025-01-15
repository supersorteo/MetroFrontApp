import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

interface Alert {
  code: string;
  fechaVencimiento: string;
}
@Injectable({
  providedIn: 'root'
})
export class AlertUserService {
  private apiUrl = 'http://localhost:8080/auth/user-code';
  constructor(private http: HttpClient) { }

  getUserCode(code: string): Observable<Alert> {
    return this.http.get<Alert>(`${this.apiUrl}/${code}`) .pipe( catchError(this.handleError) );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const errorMessage = error.error.message || 'Error desconocido';
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

}
