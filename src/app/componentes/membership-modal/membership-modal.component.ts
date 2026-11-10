import { CommonModule } from '@angular/common';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { MembershipPaymentService } from '../../servicios/membership-payment.service';
import { mapMembershipCountryOption, MembershipCountryOption } from '../../core/membership/membership-checkout.util';

declare const bootstrap: any;

export interface MembershipUserData {
  email?: string;
  telefono?: string;
  provincia?: string;
  pais?: string;
}

export interface MembershipCheckoutSelection {
  planMonths: number;
  countryCode: string | null;
  email?: string;
  phone?: string;
  province?: string;
}

export interface MembershipWhatsAppSelection {
  planMonths: number;
  countryName: string;
  text: string;
}

@Component({
  selector: 'app-membership-modal',
  standalone: true,
  imports: [CommonModule, AssetUrlPipe],
  templateUrl: './membership-modal.component.html',
  styleUrl: './membership-modal.component.scss'
})
export class MembershipModalComponent implements OnDestroy {
  @Input() userData: MembershipUserData | null = null;
  @Output() checkout = new EventEmitter<MembershipCheckoutSelection>();
  @Output() whatsapp = new EventEmitter<MembershipWhatsAppSelection>();

  @ViewChild('planesModal') private planesModalElement?: ElementRef<HTMLElement>;

  planesPais: MembershipCountryOption | null = null;
  selectedPlanMeses: number | null = null;
  planesLoading = false;

  private modalInstance: any = null;
  private readonly destroy$ = new Subject<void>();
  private readonly demoCountries = [
    { nombre: 'Argentina', codigo: 'AR', flag: '' },
    { nombre: 'Chile', codigo: 'CL', flag: '' },
    { nombre: 'Colombia', codigo: 'CO', flag: '' },
    { nombre: 'Uruguay', codigo: 'UY', flag: '' }
  ];

  readonly membershipBenefits = [
    {
      image: 'assets/benefits/materials-calculator-sprite-v2.png',
      title: 'Calculadora de materiales',
      description: 'Calculá cantidades de materiales de forma rápida y clara.'
    },
    {
      image: 'assets/benefits/unlimited-tasks-sprite.png',
      title: 'Tareas ilimitadas por presupuesto',
      description: 'Organizá todos los trabajos de cada presupuesto sin límites.'
    },
    {
      image: 'assets/benefits/clients-companies-sprite.png',
      title: 'Clientes y empresas según tu plan',
      description: 'Gestioná tus clientes y empresas con la capacidad incluida en tu membresía.'
    },
    {
      image: 'assets/benefits/saved-budgets-sprite.png',
      title: 'Guardado de presupuestos',
      description: 'Conservá tus presupuestos organizados para retomarlos cuando quieras.'
    },
    {
      image: 'assets/benefits/regional-prices-sprite.png',
      title: 'Precios actualizados por región',
      description: 'Trabajá con referencias de precios actualizadas para tu zona.'
    }
  ];

  constructor(private readonly membershipPaymentService: MembershipPaymentService) {}

  open(): void {
    this.selectedPlanMeses = null;
    this.cargarPlanesDemoPais();
    const element = this.planesModalElement?.nativeElement;
    if (!element) return;
    this.modalInstance ??= bootstrap.Modal.getOrCreateInstance(element);
    this.modalInstance.show();
  }

  seleccionarPlan(meses: number): void {
    this.selectedPlanMeses = meses;
  }

  volverASeleccionarPlan(): void {
    this.selectedPlanMeses = null;
  }

  irAlCheckout(): void {
    const planMonths = this.selectedPlanMeses;
    if (!planMonths) return;

    this.hide();
    this.checkout.emit({
      planMonths,
      countryCode: this.planesPais?.codigo || this.getCountryCode(),
      email: this.userData?.email,
      phone: this.userData?.telefono,
      province: this.userData?.provincia
    });
  }

  pagarPorWhatsApp(): void {
    const planMonths = this.selectedPlanMeses;
    if (!planMonths) return;

    const plan = this.planesPais?.plans.find(item => item.months === planMonths);
    const countryName = this.planesPais?.nombre || this.getCountryName();
    const price = plan ? `${Math.round(plan.amount).toLocaleString('es')} ${this.planesPais?.currency}` : '';
    const text = `Hola! Quiero adquirir el plan de ${planMonths} meses${price ? ` (${price})` : ''} para MetroApp. Soy de ${countryName}.`;
    const phone = '5491128634744';
    window.open(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`, '_blank');

    this.hide();
    this.whatsapp.emit({ planMonths, countryName, text });
  }

  private hide(): void {
    this.modalInstance?.hide();
  }

  private cargarPlanesDemoPais(): void {
    const demoPais = this.getCountryName();
    const cached = localStorage.getItem('membershipCatalogCache');
    if (cached) {
      try {
        const catalog: MembershipCountryOption[] = JSON.parse(cached);
        this.planesPais = catalog.find(country => country.nombre === demoPais) ?? null;
        return;
      } catch {
        // If the cache is malformed, refresh it from the API below.
      }
    }

    this.planesLoading = true;
    this.membershipPaymentService.getCatalog()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: catalog => {
          const options = Object.entries(catalog.countries)
            .map(([code, country]) => mapMembershipCountryOption(code, country, this.demoCountries));
          localStorage.setItem('membershipCatalogCache', JSON.stringify(options));
          this.planesPais = options.find(country => country.nombre === demoPais) ?? null;
          this.planesLoading = false;
        },
        error: () => { this.planesLoading = false; }
      });
  }

  private getCountryName(): string {
    return this.userData?.pais || localStorage.getItem('demoPais') || 'Argentina';
  }

  private getCountryCode(): string | null {
    const countryName = this.getCountryName().toLowerCase();
    return this.demoCountries.find(country => country.nombre.toLowerCase() === countryName)?.codigo || null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
