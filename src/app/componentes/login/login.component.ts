import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import { Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../servicios/auth.service';
import { AccessCodeService } from '../../servicios/access-code.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ProvinciaService } from '../../servicios/provincia.service';
import { MembershipPaymentService } from '../../servicios/membership-payment.service';
import { PayPalPaymentService } from '../../servicios/paypal-payment.service';
import { countryDisplayName } from '../../core/country/country.util';
import { accessCodeCountryMismatchMessage } from '../../core/country/access-code.util';
import { phonePlaceholder, sanitizePhoneInput, validatePhoneByCountry } from '../../core/country/phone.util';
import { buildMembershipCheckoutPayload, buildPayPalCheckoutPayload, mapMembershipCountryOption, MembershipCheckoutForm, MembershipCountryOption, validateMembershipCheckoutForm } from '../../core/membership/membership-checkout.util';
import { extractApiErrorMessage } from '../../core/http/api-error.util';
import Swal from 'sweetalert2';
import { AdminService, AdminCountry } from '../../servicios/admin.service';
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
  loginStep: 'home' | 'login' | 'join' | 'register' | 'checkout' | 'adminCountry' | 'adminLogin' = 'home';
  websiteUrl: string = "https://wa.link/9lbeyq";

  errorMessage: string = '';
  successMessage: string = '';
  modal:boolean = false;
  isFormValid: boolean = false;
  provincias: Provincia[] = [];
  telefonoErrorMessage: string = '';
  codeCountry: string | null = null;
  codeCountryErrorMessage: string = '';
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

  // Admin login
  adminCountries = [
    { pais: 'argentina' as const, flag: 'AR', nombre: 'Argentina' },
    { pais: 'uruguay'   as const, flag: 'UY', nombre: 'Uruguay'   },
    { pais: 'colombia'  as const, flag: 'CO', nombre: 'Colombia'  },
  ];
  selectedAdminPais: AdminCountry | null = null;
  adminUsername = '';
  adminPassword = '';
  adminLoginError = '';
  showAdminPassword = false;

  @ViewChild('exampleModal') exampleModal!: ElementRef;

constructor(private authService: AuthService,
  private accessCodeService: AccessCodeService,
  private route:Router,
  private activatedRoute: ActivatedRoute,
  private renderer: Renderer2,
  private toastr: ToastrService,
  private provinciaService: ProvinciaService,
  private membershipPaymentService: MembershipPaymentService,
  private payPalPaymentService: PayPalPaymentService,
  private adminService: AdminService){}

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
    Swal.fire('Error', 'Debe ingresar su codigo', 'error');
    return;
  }
  this.authService.login(this.code).subscribe(
    response => {
      if (response.email && response.email !== 'Codigo no encontrado' && response.email !== 'Codigo existe pero no asignado a un usuario') {
        this.isAuthenticated = true;
        this.email = response.email;
        //localStorage.clear();
        this.route.navigate(['dashboard']);
        Swal.fire('Exito', 'Login exitoso', 'success');
        localStorage.setItem('userCode', this.code);
        localStorage.setItem('userEmail', this.email);
        localStorage.setItem('userData', JSON.stringify(response)); // Guardar objeto completo
      } else {
        Swal.fire('Error', response.email || 'Error al iniciar sesion', 'error');
      }
    },
    error => {
      const msg = error.error?.email || error.message || 'Error al iniciar sesion';
      Swal.fire('Error', msg, 'error');
    }
  );
}



  register(): void {
    this.validateForm();
    if (!this.isFormValid) {
      Swal.fire('Error', this.codeCountryErrorMessage || this.telefonoErrorMessage || 'Completa correctamente los datos del registro.', 'error');
      return;
    }

    const normalizedCode = this.accessCodeService.normalizeCode(this.code);

    this.accessCodeService.getCodeCountry(normalizedCode).subscribe({
      next: (detectedCountry) => {
        this.code = normalizedCode;
        this.codeCountry = detectedCountry;
        this.codeCountryErrorMessage = this.getCodeCountryMismatchMessage();

        if (this.codeCountryErrorMessage) {
          this.validateForm();
          Swal.fire('Error', this.codeCountryErrorMessage, 'error');
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
            if (response.message === 'Datos asignados con exito') {
              Swal.fire('Exito', response.message, 'success');
              this.clearForm();
            } else {
              Swal.fire('Error', response.message, 'error');
            }
          },
          error => {
            Swal.fire('Error', error.message, 'error');
          }
        );
      },
      error: (error) => {
        Swal.fire('Error', error.message || 'No se pudo validar el codigo.', 'error');
      }
    });
  }

    validateForm(): void {
      const phoneValidation = validatePhoneByCountry(this.telefono, this.pais);
      this.telefonoErrorMessage = phoneValidation.message;
      this.codeCountryErrorMessage = this.getCodeCountryMismatchMessage();
      this.isFormValid = this.code.trim().length > 0 &&
      this.email.trim().length > 0 &&
      phoneValidation.valid &&
      this.provincia.trim().length > 0 &&
      this.pais !== null &&
      !this.codeCountryErrorMessage;
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

  onCodeInput(): void {
    this.code = this.accessCodeService.normalizeCode(this.code);
    this.codeCountry = null;
    this.codeCountryErrorMessage = '';
    this.validateForm();
  }

  syncCountryWithCode(showErrors: boolean = true): void {
    const normalizedCode = this.accessCodeService.normalizeCode(this.code);
    if (!normalizedCode) {
      this.codeCountry = null;
      this.codeCountryErrorMessage = '';
      this.validateForm();
      return;
    }

    this.accessCodeService.getCodeCountry(normalizedCode).subscribe({
      next: (detectedCountry) => {
        this.code = normalizedCode;
        this.codeCountry = detectedCountry;

        if (detectedCountry && this.pais !== detectedCountry) {
          this.pais = detectedCountry;
          this.onPaisChange();
          return;
        }

        this.validateForm();
      },
      error: (error) => {
        this.codeCountry = null;
        this.codeCountryErrorMessage = '';
        this.validateForm();
        if (showErrors) {
          this.toastr.error(error?.message || 'No se pudo validar el codigo.');
        }
      }
    });
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
      logoUrl: 'assets/demo-logo/demo-logo.jpg',
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
    tarea: 'BASE ZAPATA ARMADO Y LLENADO H O (1,00X1,00X0,80)',
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
    tarea: 'BASE ZAPATA ARMADO Y LLENADO H O X M3',
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
    tarea: 'BASE H O LIMPIEZA 5 CM DE ESPESOR H O 180 A200 KG/M3 + CENTRADO ARMADURA',
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
  const phone = '54 9 11 2863-4744'; // Reemplaza con el numero real
  const text = 'Hola! quiero una clave de membresia para "METRO"';
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
      const text = `METRO, la app con precios de la construccion. Hace tus presupuestos mas facil y rapido. ${url}`;
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(text)}`; window.location.href = whatsappUrl;
    }

    clearForm(): void {
      this.code = '';
      this.email = '';
      //this.username = '';
      this.telefono = '';
      this.pais = null;
      this.provincia = '';
      this.codeCountry = null;
      this.codeCountryErrorMessage = '';
      this.telefonoErrorMessage = '';
      this.isFormValid = false;
    }

    get selectedMembershipCountry(): MembershipCountryOption | undefined {
      return this.membershipCountries.find(country => country.codigo === this.purchaseCountryCode);
    }

    get selectedPlanAmount(): number | null {
      return this.selectedMembershipCountry?.plans.find(plan => plan.months === this.purchasePlanMonths)?.amount ?? null;
    }

    get canStartCheckout(): boolean {
      return validateMembershipCheckoutForm(
        this.purchaseCheckoutForm,
        this.selectedMembershipCountry?.nombre || null
      ).valid;
    }

    get purchaseCheckoutForm(): MembershipCheckoutForm {
      return {
        countryCode: this.purchaseCountryCode,
        planMonths: this.purchasePlanMonths,
        payerName: this.purchaseName,
        payerEmail: this.purchaseEmail,
        payerPhone: this.purchasePhone,
        payerDocument: this.purchaseDocument,
        province: this.purchaseProvince
      };
    }

    loadMembershipCatalog(): void {
      this.isLoadingCatalog = true;
      this.membershipPaymentService.getCatalog().subscribe({
        next: (catalog) => {
          this.membershipCountries = Object.entries(catalog.countries)
            .map(([countryCode, country]) => mapMembershipCountryOption(countryCode, country, this.countries))
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
      const validation = validateMembershipCheckoutForm(
        this.purchaseCheckoutForm,
        this.selectedMembershipCountry?.nombre || null
      );
      this.purchasePhoneErrorMessage = validation.phoneMessage;

      if (!validation.valid || !this.purchaseCountryCode || !this.purchasePlanMonths) {
        Swal.fire('Faltan datos', this.purchasePhoneErrorMessage || 'Completa los datos para iniciar el pago.', 'warning');
        return;
      }

      this.isStartingCheckout = true;
      this.membershipPaymentService.createCheckout(
        buildMembershipCheckoutPayload(this.purchaseCheckoutForm, `${window.location.origin}/payment-result`)
      ).subscribe({
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
          Swal.fire('Error', this.getCheckoutErrorMessage(error, 'No se pudo iniciar el checkout.'), 'error');
        }
      });
    }

    startPayPalCheckout(): void {
      const validation = validateMembershipCheckoutForm(
        this.purchaseCheckoutForm,
        this.selectedMembershipCountry?.nombre || null
      );
      this.purchasePhoneErrorMessage = validation.phoneMessage;

      if (!validation.valid || !this.purchaseCountryCode || !this.purchasePlanMonths) {
        Swal.fire('Faltan datos', this.purchasePhoneErrorMessage || 'Completa los datos para iniciar el pago.', 'warning');
        return;
      }

      this.isStartingPayPal = true;
      this.payPalPaymentService.createCheckout(
        buildPayPalCheckoutPayload(this.purchaseCheckoutForm, `${window.location.origin}/payment-result`)
      ).subscribe({
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
          Swal.fire('Error', this.getCheckoutErrorMessage(error, 'No se pudo iniciar el checkout con PayPal.'), 'error');
        }
      });
    }

    get telefonoPlaceholder(): string {
      return phonePlaceholder(this.pais);
    }

    get purchasePhonePlaceholder(): string {
      return phonePlaceholder(this.selectedMembershipCountry?.nombre || null);
    }

    onTelefonoInput(): void {
      this.telefono = sanitizePhoneInput(this.telefono);
      this.validateForm();
    }

    onPurchasePhoneInput(): void {
      this.purchasePhone = sanitizePhoneInput(this.purchasePhone);
      this.purchasePhoneErrorMessage = validateMembershipCheckoutForm(
        this.purchaseCheckoutForm,
        this.selectedMembershipCountry?.nombre || null
      ).phoneMessage;
    }

    private getCodeCountryMismatchMessage(): string {
      return accessCodeCountryMismatchMessage(this.codeCountry, this.pais);
    }

    private getCheckoutErrorMessage(error: unknown, fallback: string): string {
      return extractApiErrorMessage(error, fallback);
    }

  selectAdminCountry(pais: AdminCountry): void {
    const current = this.adminService.getCurrentAdmin();
    if (current && current.pais === pais) {
      this.route.navigate(['/admin-generate-code']);
      return;
    }
    this.selectedAdminPais = pais;
    this.adminUsername = '';
    this.adminPassword = '';
    this.adminLoginError = '';
    this.loginStep = 'adminLogin';
  }

  adminLogin(): void {
    this.adminLoginError = '';
    this.adminService.loginForCountry(this.adminUsername, this.adminPassword, this.selectedAdminPais).subscribe(result => {
      if (result.error) {
        this.adminLoginError = result.error;
        return;
      }
      this.route.navigate(['/admin-generate-code']);
    });
  }

}
