import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MembershipPaymentService, MembershipPaymentStatusResponse } from '../../servicios/membership-payment.service';
import { PayPalPaymentService, PayPalPaymentStatusResponse } from '../../servicios/paypal-payment.service';

type UnifiedOrder = MembershipPaymentStatusResponse | PayPalPaymentStatusResponse;

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-result.component.html',
  styleUrl: './payment-result.component.scss'
})
export class PaymentResultComponent implements OnInit {
  order: UnifiedOrder | null = null;
  provider: 'mercadopago' | 'paypal' = 'mercadopago';
  loading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private membershipPaymentService: MembershipPaymentService,
    private payPalPaymentService: PayPalPaymentService
  ) {}

  ngOnInit(): void {
    const params     = this.route.snapshot.queryParamMap;
    const externalId = params.get('externalId') || params.get('external_reference') || localStorage.getItem('pendingPaymentId');
    const token      = params.get('token');       // PayPal devuelve el orderId como "token"
    const providerParam = params.get('provider'); // "paypal" o null (MP)

    if (!externalId && !token) {
      this.loading = false;
      this.errorMessage = 'No se encontro una orden de pago pendiente.';
      return;
    }

    const isPayPal = providerParam === 'paypal' || (externalId?.startsWith('PP-'));

    if (isPayPal) {
      this.provider = 'paypal';
      this.handlePayPal(externalId, token);
    } else {
      this.provider = 'mercadopago';
      this.handleMercadoPago(externalId!);
    }
  }

  private handlePayPal(externalId: string | null, token: string | null): void {
    if (externalId && token) {
      // Viene de la redirección de PayPal → capturar el pago
      this.payPalPaymentService.capturePayment(externalId, token).subscribe({
        next: (order) => {
          this.order = order;
          this.loading = false;
          if (order.status === 'PAID') localStorage.removeItem('pendingPaymentId');
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err?.error?.message || 'No se pudo capturar el pago con PayPal.';
        }
      });
    } else if (externalId) {
      // Solo consulta de estado
      this.payPalPaymentService.getStatus(externalId).subscribe({
        next: (order) => { this.order = order; this.loading = false; },
        error: (err) => { this.loading = false; this.errorMessage = err?.message || 'Error consultando estado PayPal.'; }
      });
    }
  }

  private handleMercadoPago(externalId: string): void {
    this.membershipPaymentService.getStatus(externalId).subscribe({
      next: (order) => {
        this.order = order;
        this.loading = false;
        if (order.status === 'PAID' && order.accessCode) {
          localStorage.removeItem('pendingPaymentId');
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.message || 'No se pudo consultar el estado del pago.';
      }
    });
  }

  retryCheck(): void {
    this.loading = true;
    this.errorMessage = '';
    this.order = null;
    this.ngOnInit();
  }

  get paymentMessage(): string {
    const providerName = this.provider === 'paypal' ? 'PayPal' : 'Mercado Pago';
    switch (this.order?.status) {
      case 'PAID':     return `${providerName} confirmo el pago correctamente.`;
      case 'REJECTED': return `${providerName} informo que el pago fue rechazado o cancelado.`;
      default:         return `El pago sigue pendiente de confirmacion por ${providerName}.`;
    }
  }

  useAccessCode(): void {
    if (!this.order?.accessCode) return;
    this.router.navigate(['/'], { queryParams: { code: this.order.accessCode, paid: '1' } });
  }

  backToLogin(): void {
    this.router.navigate(['/']);
  }
}
