import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { APP_API_URL } from '../core/api/api.config';

export interface LegacyCodeDTO {
  code: string;
  meses: number;
  fechaAdquisicion: string | null;
  fechaVencimiento: string | null;
  fechaCreacion: string | null;
  claimed: boolean;
  claimedByEmail: string | null;
  claimedAt: string | null;
}

export interface LegacyImportResult {
  imported: number;
  skipped: number;
  total: number;
}

export interface LegacyPage {
  content: LegacyCodeDTO[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface LegacyClaimResponse {
  message: string;
  code: string;
  email: string;
  telefono: string;
  pais: string;
  provincia: string;
  fechaRegistro: string;
  fechaVencimiento: string;
}

@Injectable({ providedIn: 'root' })
export class LegacyCodeService {
  private adminBase = `${APP_API_URL}/admin/legacy-codes`;
  private publicBase = `${APP_API_URL}/legacy-codes`;

  constructor(private http: HttpClient) {}

  importCodes(): Observable<LegacyImportResult> {
    return this.http.post<LegacyImportResult>(`${this.adminBase}/import`, {});
  }

  getCodes(): Observable<LegacyPage> {
    return this.http.get<LegacyPage>(`${this.adminBase}?page=0&size=2000`);
  }

  deleteCode(code: string): Observable<void> {
    return this.http.delete<void>(`${this.adminBase}/${code}`);
  }

  deleteExpired(): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(`${this.adminBase}/expired`);
  }

  deleteAllCodes(): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(`${this.adminBase}`);
  }

  resetClaim(code: string): Observable<void> {
    return this.http.delete<void>(`${this.adminBase}/${code}/claim`);
  }

  checkCode(code: string): Observable<LegacyCodeDTO | null> {
    return this.http.get<LegacyCodeDTO>(`${this.publicBase}/check/${code}`).pipe(
      catchError(() => of(null))
    );
  }

  claimAndActivate(code: string, email: string, telefono: string, provincia: string): Observable<LegacyClaimResponse> {
    return this.http.post<LegacyClaimResponse>(`${this.publicBase}/claim/${code}`, { email, telefono, provincia });
  }
}
