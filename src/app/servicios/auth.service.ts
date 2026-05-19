import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { AUTH_API_URL } from '../core/api/api.config';
import { extractApiErrorMessage } from '../core/http/api-error.util';




export interface AuthResponse {
  message: string;
  code: string;
  email: string;
  telefono: string;
  pais?: string;
  provincia: string
}




export interface AccessCode {
  code: string;
  email: string;
  telefono?: string;
  pais?: string;
  provincia?: string;
  fechaRegistro?: string;
  fechaVencimiento?: string;
  disabled?: boolean;
}

export interface UserDataSummary {
  email: string;
  empresas: number;
  clientes: number;
  presupuestos: number;
  tareasPersonalizadas: number;
  hasData: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

 //private apiUrl = 'http://localhost:8080/auth';
  //private apiUrl= 'https://adequate-education-production.up.railway.app/auth'

  private apiUrl = AUTH_API_URL;


  constructor(private http: HttpClient, private router: Router) { }

  isTrialMode(): boolean {
  return localStorage.getItem('trialMode') === 'true';
}


      login(code: string): Observable<AuthResponse> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { code }, { headers }) .pipe(
          catchError(this.handleError)
        );
       }






       isLoggedIn(): boolean {
        const userCode = localStorage.getItem('userCode');
        const userEmail = localStorage.getItem('userEmail');
        return !!userCode && !!userEmail;
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
              errorMessage = extractApiErrorMessage(error);
            }
          } return throwError(() => new Error(errorMessage));
        }

 private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error desconocido';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      if (error.error && error.error.email) {
        errorMessage = error.error.email;
      } else if (error.status === 401) {
        errorMessage = 'Código no encontrado o no asignado';
      } else {
        errorMessage = extractApiErrorMessage(error);
      }
    }
    return throwError(() => new Error(errorMessage));
  }



    assignEmail(accessCode: AccessCode): Observable<AuthResponse> {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });
      return this.http.post<AuthResponse>(`${this.apiUrl}/codes`, accessCode, { headers }) .pipe(
        catchError(
          this.handleError1
        )
      );
    }




  logout(): void {
  localStorage.removeItem('userCode');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userData'); // Añadir esta línea
  localStorage.clear();
  localStorage.setItem('trialMode', 'false');

  //this.router.navigate(['/login']);
}

  private handleError1(error: HttpErrorResponse): Observable<never> {
    const errorMessage = extractApiErrorMessage(error);
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }





    agregarCode(accessCode: any): Observable<AuthResponse> {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });
      return this.http.post<AuthResponse>(`${this.apiUrl}/agg-code`, accessCode, { headers }) .pipe(
        catchError(this.handleError1)
      );
    }

    agregarCodes(accessCodes: AccessCode[]): Observable<AuthResponse> {
      const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
      return this.http.post<AuthResponse>(`${this.apiUrl}/agg-codes`, accessCodes, { headers }) .pipe(
        catchError(this.handleError1)
      );
    }

  getAllCodes(): Observable<AccessCode[]> { return this.http.get<AccessCode[]>(`${this.apiUrl}/codes`); }

  getCodesByPais(pais: string): Observable<AccessCode[]> { return this.http.get<AccessCode[]>(`${this.apiUrl}/codes/pais/${pais}`).pipe(catchError(this.handleError1)); }

  getUserCode(code: string): Observable<AccessCode> { return this.http.get<AccessCode>(`${this.apiUrl}/codes/${code}`) .pipe( catchError(this.handleError1) ); }

  addCode(accessCode: AccessCode): Observable<AccessCode> { return this.http.post<AccessCode>(`${this.apiUrl}/codes`, accessCode); }

  deleteCode1(code: string): Observable<void> { return this.http.delete<void>(`${this.apiUrl}/codes/${code}`); }
  deleteCode(code: string): Observable<void> { return this.http.delete<void>(`${this.apiUrl}/codes/${code}`).pipe(catchError(this.handleError1)); }

  getUserDataSummary(code: string): Observable<UserDataSummary | null> {
    return this.http.get<UserDataSummary>(`${this.apiUrl}/codes/${code}/summary`, { observe: 'response' }).pipe(
      map(r => r.status === 204 ? null : r.body),
      catchError(() => of(null))
    );
  }

  deleteUserData(code: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/codes/${code}/full`).pipe(catchError(this.handleError1));
  }

  disableCode(code: string): Observable<{ code: string; disabled: boolean }> {
    return this.http.patch<{ code: string; disabled: boolean }>(`${this.apiUrl}/codes/${code}/disable`, {}).pipe(catchError(this.handleError1));
  }

  enableCode(code: string): Observable<{ code: string; disabled: boolean }> {
    return this.http.patch<{ code: string; disabled: boolean }>(`${this.apiUrl}/codes/${code}/enable`, {}).pipe(catchError(this.handleError1));
  }
}

