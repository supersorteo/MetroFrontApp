import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { APP_API_URL } from '../core/api/api.config';
import { HttpClient } from '@angular/common/http';

export interface MembershipLimits {
  id: string | null;
  pais: string;
  demoMaxEmpresas: number;
  vip3MaxEmpresas: number;
  vip6MaxEmpresas: number;
  demoMaxClientes: number;
  vip3MaxClientes: number;
  vip6MaxClientes: number;
}

@Injectable({ providedIn: 'root' })
export class MembershipLimitsService {
  private readonly apiUrl = `${APP_API_URL.replace(/\/api$/, '')}/admin-panel`;

  constructor(private http: HttpClient) {}

  getByPais(pais: string): Observable<MembershipLimits | null> {
    return this.http.get<MembershipLimits>(`${this.apiUrl}/limits/pais/${pais}`).pipe(
      catchError(() => of(null))
    );
  }
}
