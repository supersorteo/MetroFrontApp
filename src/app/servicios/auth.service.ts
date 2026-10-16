import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { AUTH_API_URL } from '../core/api/api.config';
import { extractApiErrorMessage } from '../core/http/api-error.util';
import { metroDB } from './metro-db.service';




export interface AuthResponse {
  message: string;
  code: string;
  email: string;
  telefono: string;
  pais?: string;
  provincia: string;
  fechaVencimiento?: string;
  fechaRegistro?: string;
  sessionToken?: string;
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
  selectedEmpresaId?: number | null;
  selectedClienteId?: number | null;
  maxDevices?: number | null;
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


  private getOrCreateDeviceId(): string {
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('deviceId', id);
    }
    return id;
  }

  login(code: string): Observable<AuthResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const deviceId = this.getOrCreateDeviceId();
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { code, deviceId }, { headers }).pipe(
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
      } else if (error.status === 409) {
        errorMessage = error.error?.error ?? 'Máximo 2 dispositivos activos';
      } else if (error.status === 401) {
        errorMessage = 'Código no encontrado o no asignado';
      } else {
        errorMessage = extractApiErrorMessage(error);
      }
    }
    const enriched: any = new Error(errorMessage);
    enriched.status = error.status;
    return throwError(() => enriched);
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
    const lastCode = localStorage.getItem('userCode');
    const existingLastLoginCode = localStorage.getItem('lastLoginCode');
    const sessionToken = localStorage.getItem('sessionToken');
    const deviceId = localStorage.getItem('deviceId');
    const preserved = this.saveTermsKeys();

    if (sessionToken) {
      this.http.delete(`${this.apiUrl}/session/${sessionToken}`).subscribe({ error: () => {} });
    }

    localStorage.clear();
    this.restoreTermsKeys(preserved);
    localStorage.setItem('trialMode', 'false');
    if (deviceId) localStorage.setItem('deviceId', deviceId);
    if (lastCode && lastCode !== 'demo') {
      localStorage.setItem('lastLoginCode', lastCode);
    } else if (existingLastLoginCode) {
      // logout desde demo mode — preservar el código real previo
      localStorage.setItem('lastLoginCode', existingLastLoginCode);
    }
  }

  /** Limpia datos de sesión anterior si cambia el userCode. Previene que un nuevo usuario vea datos del anterior. */
  clearStaleSessionIfNeeded(newUserCode: string): void {
    const prevCode = localStorage.getItem('userCode');
    if (!prevCode || prevCode === newUserCode) return;

    const lastLoginCode = localStorage.getItem('lastLoginCode');
    const deviceId = localStorage.getItem('deviceId');
    const prevSessionToken = localStorage.getItem('sessionToken');
    const preserved = this.saveTermsKeys();

    if (prevSessionToken) {
      this.http.delete(`${this.apiUrl}/session/${prevSessionToken}`).subscribe({ error: () => {} });
    }

    localStorage.clear();
    this.restoreTermsKeys(preserved);
    localStorage.setItem('trialMode', 'false');
    if (lastLoginCode) localStorage.setItem('lastLoginCode', lastLoginCode);
    if (deviceId) localStorage.setItem('deviceId', deviceId);

    metroDB.appState.clear().catch(() => {});
  }

  private saveTermsKeys(): Record<string, string> {
    const saved: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('metro.terms.accepted.')) {
        saved[key] = localStorage.getItem(key)!;
      }
    }
    return saved;
  }

  private restoreTermsKeys(saved: Record<string, string>): void {
    Object.entries(saved).forEach(([key, value]) => localStorage.setItem(key, value));
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

  getUserCode(code: string, extraHeaders?: Record<string, string>): Observable<AccessCode> {
    let headers = new HttpHeaders();
    if (extraHeaders) {
      Object.entries(extraHeaders).forEach(([k, v]) => { headers = headers.set(k, v); });
    }
    return this.http.get<AccessCode>(`${this.apiUrl}/codes/${code}`, { headers }).pipe(catchError(this.handleError1));
  }

  addCode(accessCode: AccessCode): Observable<AccessCode> { return this.http.post<AccessCode>(`${this.apiUrl}/codes`, accessCode); }

  deleteCode1(code: string): Observable<void> { return this.http.delete<void>(`${this.apiUrl}/codes/${code}`); }
  deleteCode(code: string): Observable<void> { return this.http.delete<void>(`${this.apiUrl}/codes/${code}`).pipe(catchError(this.handleError1)); }

  // TEST ONLY — comentar tras pruebas
  setExpiry(code: string, fechaVencimiento: string, fechaRegistro?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/codes/${code}/expiry`, { fechaVencimiento, fechaRegistro })
      .pipe(catchError(this.handleError1));
  }

  reactivate(expiredCode: string, newCode: string, email: string): Observable<AccessCode> {
    return this.http.post<AccessCode>(`${this.apiUrl}/reactivate`, { expiredCode, newCode, email })
      .pipe(catchError(this.handleError));
  }

  getUserDataSummary(code: string): Observable<UserDataSummary | null> {
    return this.http.get<UserDataSummary>(`${this.apiUrl}/codes/${code}/summary`, { observe: 'response' }).pipe(
      map(r => r.status === 204 ? null : r.body),
      catchError(() => of(null))
    );
  }

  deleteUserData(code: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/codes/${code}/full`).pipe(catchError(this.handleError1));
  }

  updateMaxDevices(code: string, maxDevices: number | null): Observable<{ code: string; maxDevices: number }> {
    return this.http.patch<{ code: string; maxDevices: number }>(`${this.apiUrl}/codes/${code}/max-devices`, { maxDevices })
      .pipe(catchError(this.handleError1));
  }

  disableCode(code: string): Observable<{ code: string; disabled: boolean }> {
    return this.http.patch<{ code: string; disabled: boolean }>(`${this.apiUrl}/codes/${code}/disable`, {}).pipe(catchError(this.handleError1));
  }

  enableCode(code: string): Observable<{ code: string; disabled: boolean }> {
    return this.http.patch<{ code: string; disabled: boolean }>(`${this.apiUrl}/codes/${code}/enable`, {}).pipe(catchError(this.handleError1));
  }

  updatePreferences(code: string, selectedEmpresaId: number | null, selectedClienteId: number | null): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/codes/${code}/preferences`, { selectedEmpresaId, selectedClienteId })
      .pipe(catchError(() => of(null)));
  }
}

