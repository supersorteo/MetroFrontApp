import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MembershipPaymentService, MembershipPaymentStatusResponse } from '../../servicios/membership-payment.service';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-result.component.html',
  styleUrl: './payment-result.component.scss'
})
export class PaymentResultComponent implements OnInit {
  order: MembershipPaymentStatusResponse | null = null;
  loading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private membershipPaymentService: MembershipPaymentService
  ) {}

  ngOnInit(): void {
    const queryExternalId =
      this.route.snapshot.queryParamMap.get('externalId') ||
      this.route.snapshot.queryParamMap.get('external_reference');
    const storedExternalId = localStorage.getItem('pendingPaymentId');
    const externalId = queryExternalId || storedExternalId;

    if (!externalId) {
      this.loading = false;
      this.errorMessage = 'No se encontro una orden de pago pendiente.';
      return;
    }

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
    this.ngOnInit();
  }

  get paymentMessage(): string {
    switch (this.order?.status) {
      case 'PAID':
        return 'Mercado Pago confirmo el pago correctamente.';
      case 'REJECTED':
        return 'Mercado Pago informo que el pago fue rechazado o cancelado.';
      default:
        return 'El pago sigue pendiente de confirmacion por Mercado Pago.';
    }
  }

  useAccessCode(): void {
    if (!this.order?.accessCode) {
      return;
    }
    this.router.navigate(['/'], {
      queryParams: { code: this.order.accessCode, paid: '1' }
    });
  }

  backToLogin(): void {
    this.router.navigate(['/']);
  }
}
