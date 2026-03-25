import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_API_URL } from '../core/api/api.config';

export interface MembershipCatalogCountry {
  displayName: string;
  currency: string;
  documentLabel: string;
  plans: Record<string, number>;
}

export interface MembershipCatalogResponse {
  countries: Record<string, MembershipCatalogCountry>;
}

export interface CreateMembershipPaymentRequest {
  countryCode: string;
  planMonths: number;
  payerName: string;
  payerEmail: string;
  payerPhone: string;
  payerDocument: string;
  province: string;
  callbackUrl?: string;
  paymentMethodId?: string;
}

export interface CreateMembershipPaymentResponse {
  externalId: string;
  providerPaymentId: string | null;
  status: string;
  statusDetail: string | null;
  redirectUrl: string | null;
  countryCode: string;
  currencyCode: string;
  planMonths: number;
  amount: number;
}

export interface MembershipPaymentStatusResponse {
  externalId: string;
  providerPaymentId: string | null;
  status: string;
  statusDetail: string | null;
  accessCode: string | null;
  redirectUrl: string | null;
  countryCode: string;
  currencyCode: string;
  planMonths: number;
  amount: number;
  paidAt: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class MembershipPaymentService {
  private readonly apiUrl = `${APP_API_URL}/payments/memberships`;

  constructor(private http: HttpClient) {}

  getCatalog(): Observable<MembershipCatalogResponse> {
    return this.http.get<MembershipCatalogResponse>(`${this.apiUrl}/catalog`);
  }

  createCheckout(payload: CreateMembershipPaymentRequest): Observable<CreateMembershipPaymentResponse> {
    return this.http.post<CreateMembershipPaymentResponse>(`${this.apiUrl}/checkout`, payload);
  }

  getStatus(externalId: string): Observable<MembershipPaymentStatusResponse> {
    return this.http.get<MembershipPaymentStatusResponse>(`${this.apiUrl}/${externalId}`);
  }
}
