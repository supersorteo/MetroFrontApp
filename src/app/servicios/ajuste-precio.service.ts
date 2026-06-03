import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { APP_API_URL } from '../core/api/api.config';

export interface AjusteResponse {
  factor: number;
  updatedAt: string;
}

export interface AjusteHistorialItem {
  id: number;
  tipo: string;
  porcentaje: number | null;
  factorResultado: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AjustePrecioService {

  private readonly apiUrl      = `${APP_API_URL}/ajuste-precio`;
  private readonly apiAdminUrl = `${APP_API_URL}/ajuste-precio-admin`;

  constructor(private http: HttpClient) {}

  // ─── Usuario ────────────────────────────────────────────────────────────────

  private cacheKey(userCode: string, pais: string): string {
    return `ajuste_precio_${userCode}_${pais}`.toLowerCase();
  }

  getFactorLocal(userCode: string, pais: string): number {
    try {
      const raw = localStorage.getItem(this.cacheKey(userCode, pais));
      return raw ? (JSON.parse(raw).factor ?? 1) : 1;
    } catch { return 1; }
  }

  syncFactor(userCode: string, pais: string): void {
    this.http.get<AjusteResponse>(`${this.apiUrl}/${userCode}/${pais}`)
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res) localStorage.setItem(this.cacheKey(userCode, pais), JSON.stringify(res));
      });
  }

  aplicarAjuste(
    userCode: string,
    pais: string,
    tipo: 'subir' | 'bajar' | 'reestablecer',
    porcentaje?: number
  ): void {
    const actual = this.getFactorLocal(userCode, pais);
    let nuevo = tipo === 'reestablecer' ? 1
               : tipo === 'subir'       ? actual * (1 + (porcentaje ?? 0) / 100)
                                        : actual * (1 - (porcentaje ?? 0) / 100);
    nuevo = Math.round(nuevo * 1_000_000) / 1_000_000;
    localStorage.setItem(this.cacheKey(userCode, pais),
      JSON.stringify({ factor: nuevo, updatedAt: new Date().toISOString() }));
    this.http.post<AjusteResponse>(this.apiUrl, { userCode, pais, tipo, porcentaje })
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res) localStorage.setItem(this.cacheKey(userCode, pais), JSON.stringify(res));
      });
  }

  getHistorial(userCode: string, pais: string): Observable<AjusteHistorialItem[]> {
    return this.http.get<AjusteHistorialItem[]>(`${this.apiUrl}/${userCode}/${pais}/historial`)
      .pipe(catchError(() => of([])));
  }

  // ─── Admin (global por país) ─────────────────────────────────────────────────

  private adminCacheKey(pais: string): string {
    return `ajuste_precio_admin_${pais}`.toLowerCase();
  }

  getAdminFactorLocal(pais: string): number {
    try {
      const raw = localStorage.getItem(this.adminCacheKey(pais));
      return raw ? (JSON.parse(raw).factor ?? 1) : 1;
    } catch { return 1; }
  }

  syncAdminFactor(pais: string): void {
    this.http.get<AjusteResponse>(`${this.apiAdminUrl}/${pais}`)
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res) localStorage.setItem(this.adminCacheKey(pais), JSON.stringify(res));
      });
  }

  aplicarAjusteAdmin(
    pais: string,
    tipo: 'subir' | 'bajar' | 'reestablecer',
    porcentaje?: number
  ): void {
    const actual = this.getAdminFactorLocal(pais);
    let nuevo = tipo === 'reestablecer' ? 1
               : tipo === 'subir'       ? actual * (1 + (porcentaje ?? 0) / 100)
                                        : actual * (1 - (porcentaje ?? 0) / 100);
    nuevo = Math.round(nuevo * 1_000_000) / 1_000_000;
    localStorage.setItem(this.adminCacheKey(pais),
      JSON.stringify({ factor: nuevo, updatedAt: new Date().toISOString() }));
    this.http.post<AjusteResponse>(this.apiAdminUrl, { pais, tipo, porcentaje })
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res) localStorage.setItem(this.adminCacheKey(pais), JSON.stringify(res));
      });
  }

  getHistorialAdmin(pais: string): Observable<AjusteHistorialItem[]> {
    return this.http.get<AjusteHistorialItem[]>(`${this.apiAdminUrl}/${pais}/historial`)
      .pipe(catchError(() => of([])));
  }
}
