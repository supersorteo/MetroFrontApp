import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { API_BASE_URL } from '../core/api/api.config';
import { countryAdminKey } from '../core/country/country.util';

export type AdminCountry = 'argentina' | 'uruguay' | 'colombia';

export interface Admin {
  id: string;
  pais: AdminCountry;
  nombre: string;
  username: string;
  password: string;
  flag: string;
}

export interface AdminLoginResult {
  admin: Admin | null;
  error: string;
}

const SESSION_KEY = 'metro_admin_session';
const RETURN_URL_KEY = 'metro_admin_return_url';
const API_URL = `${API_BASE_URL}/admin-panel`;

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  private normalizeAdmin(admin: Admin): Admin {
    return {
      ...admin,
      pais: countryAdminKey(admin.pais) ?? admin.pais
    };
  }

  getCurrentAdmin(): Admin | null {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      return session ? this.normalizeAdmin(JSON.parse(session)) : null;
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return this.getCurrentAdmin() !== null;
  }

  setReturnUrl(url: string | null | undefined): void {
    const normalized = (url || '').trim();
    if (!normalized || normalized.startsWith('/admin-generate-code')) {
      return;
    }
    localStorage.setItem(RETURN_URL_KEY, normalized);
  }

  getReturnUrl(): string | null {
    const stored = localStorage.getItem(RETURN_URL_KEY);
    return stored?.trim() || null;
  }

  consumeReturnUrl(): string | null {
    const stored = this.getReturnUrl();
    localStorage.removeItem(RETURN_URL_KEY);
    return stored;
  }

  clearReturnUrl(): void {
    localStorage.removeItem(RETURN_URL_KEY);
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
    this.clearReturnUrl();
  }

  login(username: string, password: string): Observable<Admin | null> {
    return this.http.post<Admin>(`${API_URL}/login`, { username, password }).pipe(
      tap(admin => {
        if (admin) {
          localStorage.setItem(SESSION_KEY, JSON.stringify(this.normalizeAdmin(admin)));
        }
      }),
      catchError(() => of(null))
    );
  }

  loginForCountry(username: string, password: string, pais: AdminCountry | null): Observable<AdminLoginResult> {
    if (!username.trim() || !password.trim()) {
      return of({ admin: null, error: 'Complete usuario y contrasena.' });
    }

    if (!pais) {
      return of({ admin: null, error: 'Selecciona un pais de administrador.' });
    }

    return this.login(username, password).pipe(
      map(admin => {
        if (!admin) {
          return { admin: null, error: 'Credenciales incorrectas.' };
        }

        const normalized = this.normalizeAdmin(admin);
        if (normalized.pais !== pais) {
          this.logout();
          return { admin: null, error: 'Estas credenciales no corresponden a este pais.' };
        }

        return { admin: normalized, error: '' };
      })
    );
  }

  getAll(): Observable<Admin[]> {
    return this.http.get<Admin[]>(API_URL).pipe(
      catchError(() => of([]))
    );
  }

  getById(id: string): Observable<Admin | null> {
    return this.http.get<Admin>(`${API_URL}/${id}`).pipe(
      map(admin => (admin ? this.normalizeAdmin(admin) : null)),
      catchError(() => of(null))
    );
  }

  getByPais(pais: string): Observable<Admin | null> {
    return this.http.get<Admin>(`${API_URL}/pais/${pais}`).pipe(
      map(admin => (admin ? this.normalizeAdmin(admin) : null)),
      catchError(() => of(null))
    );
  }

  updateAdmin(id: string, changes: Partial<Pick<Admin, 'nombre' | 'username' | 'password'>>): Observable<Admin | null> {
    return this.http.put<Admin>(`${API_URL}/${id}`, changes).pipe(
      tap(updated => {
        if (updated) {
          const current = this.getCurrentAdmin();
          if (current?.id === id) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(this.normalizeAdmin(updated)));
          }
        }
      }),
      catchError(() => of(null))
    );
  }

}
