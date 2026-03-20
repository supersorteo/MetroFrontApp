import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { AUTH_API_URL } from '../core/api/api.config';
import { extractApiErrorMessage } from '../core/http/api-error.util';

interface Alert {
  code: string;
  fechaVencimiento: string;
}
@Injectable({
  providedIn: 'root'
})
export class AlertUserService {
  private apiUrl = `${AUTH_API_URL}/user-code`;


  constructor(private http: HttpClient) { }

  getUserCode(code: string): Observable<Alert> {
    return this.http.get<Alert>(`${this.apiUrl}/${code}`) .pipe( catchError(this.handleError) );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const errorMessage = extractApiErrorMessage(error);
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

}
