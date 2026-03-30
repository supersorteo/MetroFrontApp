import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { countryDisplayName } from '../core/country/country.util';
import { normalizeAccessCodeInput } from '../core/country/access-code.util';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AccessCodeService {
  constructor(private authService: AuthService) {}

  normalizeCode(code: string | null | undefined): string {
    return normalizeAccessCodeInput(code);
  }

  getCodeCountry(code: string | null | undefined): Observable<string | null> {
    const normalizedCode = this.normalizeCode(code);
    return this.authService.getUserCode(normalizedCode).pipe(
      map(accessCode => countryDisplayName(accessCode?.pais || null))
    );
  }
}
