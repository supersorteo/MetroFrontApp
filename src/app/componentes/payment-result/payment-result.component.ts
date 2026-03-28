import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MembershipPaymentService, MembershipPaymentStatusResponse } from '../../servicios/membership-payment.service';
import { PayPalPaymentService, PayPalPaymentStatusResponse } from '../../servicios/paypal-payment.service';

type UnifiedOrder = MembershipPaymentStatusResponse | PayPalPaymentStatusResponse;

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS        = 30;

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-result.component.html',
  styleUrl: './payment-result.component.scss'
})
export class PaymentResultComponent implements OnInit, OnDestroy {
  order: UnifiedOrder | null = null;
  provider: 'mercadopago' | 'paypal' = 'mercadopago';
  loading    = true;
  errorMessage = '';

  private pollInterval: any    = null;
  private pollCount            = 0;
  private pollingStarted       = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private membershipPaymentService: MembershipPaymentService,
    private payPalPaymentService: PayPalPaymentService
  ) {}

  ngOnInit(): void {
    // Guard: evitar iniciar múltiples loops si ngOnInit se llama más de una vez
    if (this.pollingStarted) return;
    this.pollingStarted = true;

    const params        = this.route.snapshot.queryParamMap;
    const externalId    = params.get('externalId') || params.get('external_reference') || localStorage.getItem('pendingPaymentId');
    const token         = params.get('token');
    const providerParam = params.get('provider');

    if (!externalId && !token) {
      this.loading = false;
      this.errorMessage = 'No se encontro una orden de pago pendiente.';
      return;
    }

    const isPayPal = providerParam === 'paypal' || !!externalId?.startsWith('PP-');

    if (isPayPal) {
      this.provider = 'paypal';
      this.handlePayPal(externalId, token);
    } else {
      this.provider = 'mercadopago';
      this.startMercadoPagoPolling(externalId!);
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // ─── PayPal ───────────────────────────────────────────────
  private handlePayPal(externalId: string | null, token: string | null): void {
    if (externalId && token) {
      this.payPalPaymentService.capturePayment(externalId, token).subscribe({
        next: (order) => {
          this.order   = order;
          this.loading = false;
          if (order.status === 'PAID') localStorage.removeItem('pendingPaymentId');
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err?.error?.message || 'No se pudo capturar el pago con PayPal.';
        }
      });
    } else if (externalId) {
      this.payPalPaymentService.getStatus(externalId).subscribe({
        next:  (order) => { this.order = order; this.loading = false; },
        error: (err)   => { this.loading = false; this.errorMessage = err?.message || 'Error consultando PayPal.'; }
      });
    }
  }

  // ─── MercadoPago polling ──────────────────────────────────
  private startMercadoPagoPolling(externalId: string): void {
    const params    = this.route.snapshot.queryParamMap;
    const paymentId = params.get('payment_id') || params.get('collection_id') || undefined;

    // Primera consulta inmediata
    this.fetchStatus(externalId, paymentId);

    // Polling periódico solo si no tenemos payment_id (tab principal sin redirect de MP)
    if (!paymentId) {
      this.pollInterval = setInterval(() => {
        if (this.pollCount >= MAX_POLLS) {
          this.stopPolling();
          return;
        }
        this.pollCount++;
        this.fetchStatus(externalId);
      }, POLL_INTERVAL_MS);
    }
  }

  private fetchStatus(externalId: string, paymentId?: string): void {
    this.membershipPaymentService.getStatus(externalId, paymentId).subscribe({
      next: (order) => {
        this.order   = order;
        this.loading = false;

        if (order.status === 'PAID') {
          localStorage.removeItem('pendingPaymentId');
          this.stopPolling();
        } else if (order.status === 'REJECTED') {
          this.stopPolling();
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.message || 'No se pudo consultar el estado del pago.';
        this.stopPolling();
        console.error('[PaymentResult] Error:', error);
      }
    });
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // ─── Acciones ─────────────────────────────────────────────
  retryCheck(): void {
    this.stopPolling();
    this.pollingStarted = false;
    this.pollCount      = 0;
    this.loading        = true;
    this.errorMessage   = '';
    this.order          = null;
    this.ngOnInit();
  }

  get paymentMessage(): string {
    const name = this.provider === 'paypal' ? 'PayPal' : 'Mercado Pago';
    switch (this.order?.status) {
      case 'PAID':     return `${name} confirmo el pago correctamente.`;
      case 'REJECTED': return `${name} informo que el pago fue rechazado o cancelado.`;
      default:         return `El pago sigue pendiente de confirmacion por ${name}.`;
    }
  }

  get whatsappUrl(): string | null {
    const accessCode = this.order?.accessCode;
    const phone      = (this.order as any)?.payerPhone as string | null;
    if (!accessCode || !phone) return null;

    const cleaned = phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `¡Hola! Tu codigo de acceso Metro es: *${accessCode}*\n` +
      `Plan: ${this.order!.planMonths} meses\n` +
      `Ingresa en la app con este codigo.`
    );
    return `https://wa.me/${cleaned}?text=${message}`;
  }

  sendWhatsApp(): void {
    const url = this.whatsappUrl;
    if (url) window.open(url, '_blank');
  }

  useAccessCode(): void {
    if (!this.order?.accessCode) return;
    this.router.navigate(['/'], { queryParams: { code: this.order.accessCode, paid: '1' } });
  }

  backToLogin(): void {
    this.router.navigate(['/']);
  }
}
