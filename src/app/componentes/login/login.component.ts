import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import { Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../servicios/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ProvinciaService } from '../../servicios/provincia.service';
import { MembershipCatalogCountry, MembershipPaymentService } from '../../servicios/membership-payment.service';
import { PayPalPaymentService } from '../../servicios/paypal-payment.service';
import Swal from 'sweetalert2';
declare var bootstrap: any;

interface Provincia {
  id: number;
  nombre: string;
}

interface Country {
  nombre: string;
  codigo: string;
  flag: string;
}

interface MembershipCountryOption extends Country {
  currency: string;
  documentLabel: string;
  plans: { months: number; amount: number }[];
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],

  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit{

  code: string = '';
  email: string = '';
  username: string = '';
  telefono: string = '';
  //pais: any = null;
  pais: string | null = null;
  provincia:string = '';
  isAuthenticated: boolean = false;

  password: string = '';
  isContentVisible: boolean = false;
  loginStep: 'home' | 'login' | 'join' = 'home';
  websiteUrl: string = "https://wa.link/9lbeyq";

  errorMessage: string = '';
  successMessage: string = '';
  modal:boolean = false;
  isFormValid: boolean = false;
  provincias: Provincia[] = [];
  telefonoErrorMessage: string = '';
  countries = [
   { nombre: 'Argentina', codigo: 'AR', flag: 'https://flagcdn.com/ar.svg' },
   { nombre: 'Colombia', codigo: 'CO', flag: 'https://flagcdn.com/co.svg' },
   { nombre: 'Uruguay', codigo: 'UY', flag: 'https://flagcdn.com/uy.svg' }
  ];
  membershipCountries: MembershipCountryOption[] = [];
  purchaseCountryCode: string | null = null;
  purchasePlanMonths: number | null = 3;
  purchaseName: string = '';
  purchaseEmail: string = '';
  purchasePhone: string = '';
  purchaseDocument: string = '';
  purchaseProvince: string = '';
  purchaseProvincias: Provincia[] = [];
  purchasePhoneErrorMessage: string = '';
  isLoadingCatalog: boolean = false;
  isStartingCheckout: boolean = false;
  isStartingPayPal: boolean = false;

  @ViewChild('exampleModal') exampleModal!: ElementRef;

constructor(private authService: AuthService,
  private route:Router,
  private activatedRoute: ActivatedRoute,
  private renderer: Renderer2,
  private toastr: ToastrService,
  private provinciaService: ProvinciaService,
  private membershipPaymentService: MembershipPaymentService,
  private payPalPaymentService: PayPalPaymentService){}

  ngOnInit(): void {
    this.loadMembershipCatalog();
    this.activatedRoute.queryParamMap.subscribe(params => {
      const code = params.get('code');
      const paid = params.get('paid');
      if (code) {
        this.code = code;
      }
      if (paid === '1') {
        this.toastr.success('Tu codigo ya esta activado. Ingresa con el codigo recibido.', 'Pago confirmado');
      }
    });
  }






login(): void {
  if (this.code.trim().length === 0) {
    Swal.fire('Error', 'Debe ingresar su código', 'error');
    return;
  }
  this.authService.login(this.code).subscribe(
    response => {
      if (response.email && response.email !== 'Código no encontrado' && response.email !== 'Código existe pero no asignado a un usuario') {
        this.isAuthenticated = true;
        this.email = response.email;
        //localStorage.clear();
        this.route.navigate(['dashboard']);
        Swal.fire('Éxito', 'Login exitoso', 'success');
        localStorage.setItem('userCode', this.code);
        localStorage.setItem('userEmail', this.email);
        localStorage.setItem('userData', JSON.stringify(response)); // Guardar objeto completo
      } else {
        Swal.fire('Error', response.email || 'Error al iniciar sesión', 'error');
      }
    },
    error => {
      const msg = error.error?.email || error.message || 'Error al iniciar sesión';
      Swal.fire('Error', msg, 'error');
    }
  );
}



  register(): void {
    this.validateForm();
    if (!this.isFormValid) {
      Swal.fire('Error', this.telefonoErrorMessage || 'Completa correctamente los datos del registro.', 'error');
      return;
    }

    this.authService.assignEmail({
      code: this.code,
      email: this.email,
      telefono: this.telefono,
      pais: this.pais || '',
      provincia: this.provincia
    }).subscribe(
      response => {
        if (response.message === 'Datos asignados con éxito') {
          Swal.fire('Éxito', response.message, 'success');
          this.clearForm();
        } else {
          Swal.fire('Error', response.message, 'error');
        }
      },
      error => {
        Swal.fire('Error', error.message, 'error');
      }
    );
  }

    validateForm(): void {
      const phoneValidation = this.validatePhoneByCountry(this.telefono, this.pais);
      this.telefonoErrorMessage = phoneValidation.message;
      this.isFormValid = this.code.trim().length > 0 &&
      this.email.trim().length > 0 &&
      phoneValidation.valid &&
      this.provincia.trim().length > 0 &&
      this.pais !== null;
    }






   getProvincias(): void {
    this.provinciaService.getAllProvincias().subscribe(
      response => {
        this.provincias = response;
      },
      error => {
        Swal.fire('Error', 'Error al cargar las provincias', 'error');
      }
    );
  }



  onPaisChange(): void {
    if (this.pais) {
      this.provincia = '';
      this.telefono = '';
      this.provinciaService.getProvinciasByPais(this.pais).subscribe(
        response => {
          this.provincias = response;
        },
        error => {
          Swal.fire('Error', 'Error al cargar las provincias', 'error');
        }
      );
    } else {
      this.provincias = [];
    }
    this.validateForm();
  }


    ocultarContenido(): void {
    this.isContentVisible = false;
  }

  openCalculadora(): void {
    window.open('https://metroapp.site/calculadora_materiales.html', '_blank');
    }

  activarModoPrueba0(): void {
    const trialUserData = {
      pais: 'Argentina',
      provincia: 'Buenos Aires',
      fechaVencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    localStorage.setItem('trialMode', 'true');
    localStorage.setItem('userCode', 'trial');
    localStorage.setItem('userData', JSON.stringify(trialUserData));
    this.route.navigate(['dashboard']);
  }

  activarModoPrueba(): void {
  const trialUserData = {
    pais: 'Argentina',
    provincia: 'Buenos Aires',
    fechaVencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };

  const demoEmpresa = [
    {
      id: 1234,
      name: 'Empresa Demo',
      phone: '11 0000-0000',
      email: 'demo@metroapp.site',
      description: 'Empresa de prueba',
      logoUrl: 'assets/demo-logo/demo.jpeg',
      userCode: 'demo'
    }
  ];

  const demoTareas1 = Array.from({ length: 10 }).map((_, i) => ({
    id: i + 1,
    tarea: `Tarea demo ${i + 1}`,
    costo: 1234,
    rubro: 'Demo',
    categoria: 'Demo',
    pais: 'Argentina',
    descripcion: '',
    descuento: 0,
    area: 1,
    totalCost: 1234
  }));

  const demoTareas = [
  {
    id: 1,
    tarea: 'BASE ZAPATA ARMADO Y LLENADO Hº (1,00X1,00X0,80)',
    costo: 1234,
    rubro: 'Demo',
    categoria: 'Demo',
    pais: 'Argentina',
    descripcion: '',
    descuento: 0,
    area: 1,
    totalCost: 1234
  },
  {
    id: 2,
    tarea: 'BASE ZAPATA ARMADO Y LLENADO Hº X M3',
    costo: 1234,
    rubro: 'Demo',
    categoria: 'Demo',
    pais: 'Argentina',
    descripcion: '',
    descuento: 0,
    area: 1,
    totalCost: 1234
  },
  {
    id: 3,
    tarea: 'BASE ZAPATA SOLO CAVADO 0,80X0,80X1M',
    costo: 1234,
    rubro: 'Demo',
    categoria: 'Demo',
    pais: 'Argentina',
    descripcion: '',
    descuento: 0,
    area: 1,
    totalCost: 1234
  },
  {
    id: 4,
    tarea: 'BASE COAT',
    costo: 1234,
    rubro: 'Demo',
    categoria: 'Demo',
    pais: 'Argentina',
    descripcion: '',
    descuento: 0,
    area: 1,
    totalCost: 1234
  },
  {
    id: 5,
    tarea: 'BASE Hº LIMPIEZA 5 CM DE ESPESOR Hº 180 A200 KG/M3 + CENTRADO ARMADURA',
    costo: 1234,
    rubro: 'Demo',
    categoria: 'Demo',
    pais: 'Argentina',
    descripcion: '',
    descuento: 0,
    area: 1,
    totalCost: 1234
  },
  {
    id: 6,
    tarea: 'BASES ARMADO (GANDES OBRAS) X CANTIDAD 0,8X0,8 (PARRILLA Y ATADO PIE ARMADURA DE COLUMNA APLOMADA EN EXCAVACION)',
    costo: 1234,
    rubro: 'Demo',
    categoria: 'Demo',
    pais: 'Argentina',
    descripcion: '',
    descuento: 0,
    area: 1,
    totalCost: 1234
  },
  {
    id: 7,
    tarea: 'BASES ZAPATAS LLENADO M3 (GRANDES OBRAS)',
    costo: 1234,
    rubro: 'Demo',
    categoria: 'Demo',
    pais: 'Argentina',
    descripcion: '',
    descuento: 0,
    area: 1,
    totalCost: 1234
  },
  {
    id: 8,
    tarea: 'BIDE ARMADO GRIFERIA',
    costo: 1234,
    rubro: 'Demo',
    categoria: 'Demo',
    pais: 'Argentina',
    descripcion: '',
    descuento: 0,
    area: 1,
    totalCost: 1234
  },
  {
    id: 9,
    tarea: 'BOCA DE CALDERA',
    costo: 1234,
    rubro: 'Demo',
    categoria: 'Demo',
    pais: 'Argentina',
    descripcion: '',
    descuento: 0,
    area: 1,
    totalCost: 1234
  },
  {
    id: 10,
    tarea: 'BOCA DE CIRCUITO',
    costo: 1234,
    rubro: 'Demo',
    categoria: 'Demo',
    pais: 'Argentina',
    descripcion: '',
    descuento: 0,
    area: 1,
    totalCost: 1234
  }
];

const demoCliente = {
    id: 5678,
    name: 'Cliente Demo',
    contact: '11 1111-1111',
    budgetDate: new Date().toISOString().split('T')[0],
    additionalDetails: 'Cliente de prueba',
    userCode: 'demo',
    email: 'cliente@metroapp.site',
    clave: '20-00000000-0',
    direccion: 'Direccion demo 123',
    empresaId: 1234
  };

  Object.keys(localStorage)
    .filter(key => key.startsWith('demoCliente_'))
    .forEach(key => localStorage.removeItem(key));



  localStorage.setItem('trialMode', 'true');
  localStorage.setItem('userCode', 'demo');
  localStorage.setItem('userData', JSON.stringify(trialUserData));
  localStorage.setItem('demoEmpresas', JSON.stringify(demoEmpresa));
  localStorage.setItem('demoTareas', JSON.stringify(demoTareas));
  localStorage.setItem(`demoCliente_${demoCliente.id}`, JSON.stringify(demoCliente));
  localStorage.removeItem('selectedEmpresaId');
  localStorage.removeItem('selectedClienteId');
  localStorage.removeItem('selectedCliente');
  localStorage.setItem('selectedClienteId', String(demoCliente.id));
  localStorage.setItem('selectedCliente', JSON.stringify(demoCliente));
  localStorage.removeItem('tareasAgregadas');
  this.route.navigate(['dashboard']);
}



openWebsite(): void {
  const phone = '54 9 11 2863-4744'; // Reemplaza con el número real
  const text = 'Hola! quiero una clave de membresía para "METRO"';
  const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`;
  const fallbackUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
  try {
    window.location.href = whatsappUrl;
  } catch {
    window.location.href = fallbackUrl;
  }
}

    shareOnWhatsApp(): void {
      const url = 'www.metroapp.site';
      const text = `METRO, la app con precios de la construcción. Hacé tus presupuestos más fácil y rápido. ${url}`;
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(text)}`; window.location.href = whatsappUrl;
    }

    clearForm(): void {
      this.code = '';
      this.email = '';
      //this.username = '';
      this.telefono = '';
      this.pais = null;
      this.provincia = '';
      this.isFormValid = false;
    }

    get selectedMembershipCountry(): MembershipCountryOption | undefined {
      return this.membershipCountries.find(country => country.codigo === this.purchaseCountryCode);
    }

    get selectedPlanAmount(): number | null {
      return this.selectedMembershipCountry?.plans.find(plan => plan.months === this.purchasePlanMonths)?.amount ?? null;
    }

    get canStartCheckout(): boolean {
      const phoneEmpty = !this.purchasePhone.trim();
      const phoneValidation = this.validatePhoneByCountry(
        this.purchasePhone,
        this.selectedMembershipCountry?.nombre || null
      );
      const phoneOk = phoneEmpty || phoneValidation.valid;
      const documentRequired = this.purchaseCountryCode === 'AR';
      return !!(
        this.purchaseCountryCode &&
        this.purchasePlanMonths &&
        this.purchaseName.trim() &&
        this.purchaseEmail.trim() &&
        phoneOk &&
        (!documentRequired || this.purchaseDocument.trim()) &&
        this.purchaseProvince.trim()
      );
    }

    loadMembershipCatalog(): void {
      this.isLoadingCatalog = true;
      this.membershipPaymentService.getCatalog().subscribe({
        next: (catalog) => {
          this.membershipCountries = Object.entries(catalog.countries)
            .map(([countryCode, country]) => this.mapMembershipCountry(countryCode, country))
            .sort((left, right) => left.nombre.localeCompare(right.nombre));
          this.isLoadingCatalog = false;
        },
        error: () => {
          this.isLoadingCatalog = false;
          this.toastr.error('No se pudo cargar el catalogo de membresias.');
        }
      });
    }

    onPurchaseCountryChange(): void {
      this.purchaseProvince = '';
      this.purchaseDocument = '';
      this.purchasePhone = '';
      this.purchasePhoneErrorMessage = '';
      this.purchasePlanMonths = this.selectedMembershipCountry?.plans[0]?.months ?? null;
      if (!this.purchaseCountryCode) {
        this.purchaseProvincias = [];
        return;
      }
      this.provinciaService.getProvinciasByPais(this.selectedMembershipCountry?.nombre || this.purchaseCountryCode).subscribe({
        next: (provincias) => {
          this.purchaseProvincias = provincias;
        },
        error: () => {
          this.purchaseProvincias = [];
          this.toastr.error('No se pudieron cargar las provincias para la compra.');
        }
      });
    }

    startMembershipCheckout(): void {
      const phoneValidation = this.validatePhoneByCountry(
        this.purchasePhone,
        this.selectedMembershipCountry?.nombre || null
      );
      this.purchasePhoneErrorMessage = phoneValidation.message;

      if (!this.canStartCheckout || !this.purchaseCountryCode || !this.purchasePlanMonths) {
        Swal.fire('Faltan datos', this.purchasePhoneErrorMessage || 'Completa los datos para iniciar el pago.', 'warning');
        return;
      }

      this.isStartingCheckout = true;
      this.membershipPaymentService.createCheckout({
        countryCode: this.purchaseCountryCode,
        planMonths: this.purchasePlanMonths,
        payerName: this.purchaseName.trim(),
        payerEmail: this.purchaseEmail.trim(),
        payerPhone: this.purchasePhone.trim(),
        payerDocument: this.purchaseDocument.trim(),
        province: this.purchaseProvince.trim(),
        callbackUrl: `${window.location.origin}/payment-result`
      }).subscribe({
        next: (order) => {
          this.isStartingCheckout = false;
          if (!order.redirectUrl) {
            this.toastr.error('La pasarela no devolvio una URL de pago.');
            return;
          }
          localStorage.setItem('pendingPaymentId', order.externalId);
          window.location.href = order.redirectUrl;
        },
        error: (error) => {
          this.isStartingCheckout = false;
          Swal.fire('Error', error?.message || 'No se pudo iniciar el checkout.', 'error');
        }
      });
    }

    startPayPalCheckout(): void {
      if (!this.canStartCheckout || !this.purchaseCountryCode || !this.purchasePlanMonths) {
        Swal.fire('Faltan datos', 'Completa los datos para iniciar el pago.', 'warning');
        return;
      }

      this.isStartingPayPal = true;
      this.payPalPaymentService.createCheckout({
        countryCode: this.purchaseCountryCode,
        planMonths: this.purchasePlanMonths,
        payerName: this.purchaseName.trim(),
        payerEmail: this.purchaseEmail.trim(),
        payerPhone: this.purchasePhone.trim() || undefined,
        payerDocument: this.purchaseDocument.trim() || undefined,
        province: this.purchaseProvince.trim(),
        callbackUrl: `${window.location.origin}/payment-result`
      }).subscribe({
        next: (order) => {
          this.isStartingPayPal = false;
          if (!order.approvalUrl) {
            this.toastr.error('PayPal no devolvio una URL de pago.');
            return;
          }
          localStorage.setItem('pendingPaymentId', order.externalId);
          window.location.href = order.approvalUrl;
        },
        error: (error) => {
          this.isStartingPayPal = false;
          Swal.fire('Error', error?.error?.message || 'No se pudo iniciar el checkout con PayPal.', 'error');
        }
      });
    }

    private mapMembershipCountry(countryCode: string, country: MembershipCatalogCountry): MembershipCountryOption {
      const current = this.countries.find(item => item.codigo === countryCode);
      return {
        nombre: country.displayName,
        codigo: countryCode,
        flag: current?.flag || '',
        currency: country.currency,
        documentLabel: country.documentLabel,
        plans: Object.entries(country.plans)
          .map(([months, amount]) => ({ months: Number(months), amount }))
          .sort((left, right) => left.months - right.months)
      };
    }

    get telefonoPlaceholder(): string {
      return this.getPhonePlaceholder(this.pais);
    }

    get purchasePhonePlaceholder(): string {
      return this.getPhonePlaceholder(this.selectedMembershipCountry?.nombre || null);
    }

    onTelefonoInput(): void {
      this.telefono = this.sanitizePhoneInput(this.telefono);
      this.validateForm();
    }

    onPurchasePhoneInput(): void {
      this.purchasePhone = this.sanitizePhoneInput(this.purchasePhone);
      this.purchasePhoneErrorMessage = this.validatePhoneByCountry(
        this.purchasePhone,
        this.selectedMembershipCountry?.nombre || null
      ).message;
    }

    private sanitizePhoneInput(value: string): string {
      return value.replace(/[^0-9+\s()-]/g, '');
    }

    private getPhonePlaceholder(country: string | null): string {
      switch (country) {
        case 'Argentina':
          return 'Ej: 11 2345-6789 o +54 9 11 2345-6789';
        case 'Uruguay':
          return 'Ej: 091 234 567 o +598 91 234 567';
        case 'Colombia':
          return 'Ej: 300 123 4567 o +57 300 123 4567';
        default:
          return 'Telefono';
      }
    }

    private validatePhoneByCountry(rawPhone: string, country: string | null): { valid: boolean; message: string } {
      const phone = rawPhone.trim();
      if (!country) {
        return { valid: false, message: 'Selecciona un pais antes de cargar el telefono.' };
      }
      if (!phone) {
        return { valid: false, message: 'El telefono es obligatorio.' };
      }

      let digits = phone.replace(/\D/g, '');

      switch (country) {
        case 'Argentina':
          if (digits.startsWith('54')) {
            digits = digits.slice(2);
          }
          if (digits.startsWith('9') && digits.length >= 11) {
            digits = digits.slice(1);
          }
          if (digits.startsWith('0') && digits.length >= 11) {
            digits = digits.slice(1);
          }
          return digits.length >= 10 && digits.length <= 11
            ? { valid: true, message: '' }
            : { valid: false, message: 'El telefono de Argentina debe tener entre 10 y 11 digitos validos.' };

        case 'Uruguay':
          if (digits.startsWith('598')) {
            digits = digits.slice(3);
          }
          if (digits.startsWith('0') && digits.length === 9) {
            digits = digits.slice(1);
          }
          return digits.length === 8
            ? { valid: true, message: '' }
            : { valid: false, message: 'El telefono de Uruguay debe tener 8 digitos validos.' };

        case 'Colombia':
          if (digits.startsWith('57')) {
            digits = digits.slice(2);
          }
          return digits.length === 10
            ? { valid: true, message: '' }
            : { valid: false, message: 'El telefono de Colombia debe tener 10 digitos validos.' };

        default:
          return digits.length >= 8 && digits.length <= 15
            ? { valid: true, message: '' }
            : { valid: false, message: 'El telefono no tiene un formato valido.' };
      }
    }
}
