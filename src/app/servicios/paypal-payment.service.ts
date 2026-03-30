import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_API_URL } from '../core/api/api.config';

export interface CreatePayPalPaymentRequest {
  countryCode: string;
  planMonths: number;
  payerName: string;
  payerEmail: string;
  payerPhone?: string;
  payerDocument?: string;
  province: string;
  callbackUrl?: string;
}

export interface CreatePayPalPaymentResponse {
  externalId: string;
  paypalOrderId: string | null;
  status: string;
  approvalUrl: string | null;
  countryCode: string;
  currencyCode: string;
  planMonths: number;
  amount: number;
  baseUsdAmount: number;
  exchangeRateApplied: number;
}

export interface PayPalPaymentStatusResponse {
  externalId: string;
  paypalOrderId: string | null;
  status: string;
  statusDetail: string | null;
  accessCode: string | null;
  payerPhone: string | null;
  countryCode: string;
  currencyCode: string;
  planMonths: number;
  amount: number;
  paidAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class PayPalPaymentService {
  private readonly apiUrl = `${APP_API_URL}/payments/paypal`;

  constructor(private http: HttpClient) {}

  createCheckout(payload: CreatePayPalPaymentRequest): Observable<CreatePayPalPaymentResponse> {
    return this.http.post<CreatePayPalPaymentResponse>(`${this.apiUrl}/checkout`, payload);
  }

  capturePayment(externalId: string, token: string): Observable<PayPalPaymentStatusResponse> {
    return this.http.post<PayPalPaymentStatusResponse>(
      `${this.apiUrl}/capture?externalId=${externalId}&token=${token}`, {}
    );
  }

  getStatus(externalId: string): Observable<PayPalPaymentStatusResponse> {
    return this.http.get<PayPalPaymentStatusResponse>(`${this.apiUrl}/${externalId}`);
  }
}
