import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, of, throwError } from 'rxjs';

/*interface AccessCode {
  id: number;
  code: string;
}*/

interface AccessCode {
  code: string;
  email: string;
}

interface AuthResponse {
  message: string;
  code?: string;
  email?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/auth';

  constructor(private http: HttpClient) { }

      login1(code: string): Observable<AuthResponse> {
        const headers = new HttpHeaders({
          'Content-Type': 'application/json'
        }); return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { code }, { headers })
        .pipe( catchError( this.handleError<AuthResponse>('login', {
          email: 'Error',
          message: ''
        }) ) );
      }

      login(code: string): Observable<AuthResponse> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { code }, { headers }) .pipe(
          catchError(this.handleError0)
        );
       }



    private handleError<T>(operation = 'operation', result?: T) {
      return (error: any): Observable<T> => {
        console.error(`${operation} failed: ${error.message}`);
        return of(result as T);
      };
    }

    assignEmail(accessCode: AccessCode): Observable<AuthResponse> {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });
      return this.http.post<AuthResponse>(`${this.apiUrl}/assign-email`, accessCode, { headers }) .pipe(
        catchError(
          this.handleError1
        )
      );
    }



  private handleError1(error: HttpErrorResponse): Observable<never> {
    const errorMessage = error.error.message || 'Error desconocido';
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  private handleError0(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error desconocido';
    if (error.error instanceof ErrorEvent) {
       errorMessage = `Error: ${error.error.message}`;
      } else {
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.status === 401) {
          errorMessage = 'Código no encontrado';
        } else {
          errorMessage = `Error ${error.status}: ${error.message}`;
        }
      } return throwError(() => new Error(errorMessage));
    }

  getAllCodes(): Observable<AccessCode[]> { return this.http.get<AccessCode[]>(`${this.apiUrl}/codes`); }

  addCode(accessCode: AccessCode): Observable<AccessCode> { return this.http.post<AccessCode>(`${this.apiUrl}/code`, accessCode); }

  deleteCode(id: number): Observable<void> { return this.http.delete<void>(`${this.apiUrl}/code/${id}`); }
}
