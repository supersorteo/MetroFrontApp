import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import { Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../servicios/auth.service';
import { AccessCodeService } from '../../servicios/access-code.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ProvinciaService } from '../../servicios/provincia.service';
import { MembershipPaymentService } from '../../servicios/membership-payment.service';
import { PayPalPaymentService } from '../../servicios/paypal-payment.service';
import { countryDisplayName } from '../../core/country/country.util';
import { accessCodeCountryMismatchMessage } from '../../core/country/access-code.util';
import { phonePlaceholder, sanitizePhoneInput, validatePhoneByCountry } from '../../core/country/phone.util';
import { PHONE_COUNTRIES } from '../../core/utils/phone-validation.util';
import { buildMembershipCheckoutPayload, buildPayPalCheckoutPayload, mapMembershipCountryOption, MembershipCheckoutForm, MembershipCountryOption, validateMembershipCheckoutForm } from '../../core/membership/membership-checkout.util';
import { extractApiErrorMessage } from '../../core/http/api-error.util';
import { UiDialogService } from '../../core/services/ui-dialog.service';
import { AppToastService } from '../../servicios/app-toast.service';
import { AdminService, AdminCountry } from '../../servicios/admin.service';
import { LegacyCodeService, LegacyCodeDTO } from '../../servicios/legacy-code.service';
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
export class LoginComponent implements OnInit, OnDestroy {

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
  loginStep: 'home' | 'login' | 'join' | 'register' | 'checkout' | 'adminCountry' | 'adminLogin' | 'demoCountry' | 'legacyRegister' | 'reactivate' = 'home';
  isAdminPwaSession = false;
  legacyData: LegacyCodeDTO | null = null;
  expiredCode: string = '';
  reactivateNewCode: string = '';
  reactivateEmail: string = '';
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
  private readonly unavailableCountries = new Set(['colombia', 'uruguay']);
  membershipCountries: MembershipCountryOption[] = [];
  purchaseCountryCode: string | null = null;
  purchasePlanMonths: number | null = 3;
  private pendingCountryCode: string | null = null;
  private pendingPlanMonths: number | null = null;
  private pendingPhone: string | null = null;
  private pendingProvince: string | null = null;
  purchaseName: string = '';
  purchaseEmail: string = '';
  purchasePhone: string = '';
  purchaseDocument: string = '';
  purchaseProvince: string = '';
  purchaseProvincias: Provincia[] = [];
  purchasePhoneErrorMessage: string = '';
  purchasePhonePrefix: string = '+549';
  purchasePhoneNumber: string = '';
  purchaseEmailTouched: boolean = false;
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
  private provinciaService: ProvinciaService,
  private membershipPaymentService: MembershipPaymentService,
  private payPalPaymentService: PayPalPaymentService,
  private adminService: AdminService,
  private uiDialog: UiDialogService,
  private appToast: AppToastService,
  private legacyCodeService: LegacyCodeService){}

  private provinciasCacheKey(pais: string): string {
    return `loginProvincias_${pais.toLowerCase()}`;
  }

  private membershipCatalogCacheKey(): string {
    return 'membershipCatalogCache';
  }

  /**
   * Recupera el código guardado por la versión anterior de METRO.
   * La cookie solo puede leerse cuando la nueva versión está publicada en
   * el mismo origen que www.metroapp.site.
   */
  private getLegacyAccessCodeFromCookie(): string {
    if (typeof document === 'undefined') {
      return '';
    }

    const cookie = document.cookie
      .split(';')
      .map(item => item.trim())
      .find(item => item.startsWith('password='));

    if (!cookie) {
      return '';
    }

    const rawValue = cookie.slice('password='.length);
    try {
      return decodeURIComponent(rawValue).trim();
    } catch {
      return rawValue.trim();
    }
  }

  private cacheProvincias(pais: string, provincias: Provincia[]): void {
    if (!pais) {
      return;
    }
    localStorage.setItem(this.provinciasCacheKey(pais), JSON.stringify(provincias));
  }

  private getCachedProvincias(pais: string | null | undefined): Provincia[] {
    if (!pais) {
      return [];
    }

    try {
      const raw = localStorage.getItem(this.provinciasCacheKey(pais));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private cacheMembershipCatalog(catalog: MembershipCountryOption[]): void {
    localStorage.setItem(this.membershipCatalogCacheKey(), JSON.stringify(catalog));
  }

  private getCachedMembershipCatalog(): MembershipCountryOption[] {
    try {
      const raw = localStorage.getItem(this.membershipCatalogCacheKey());
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private originalManifestHref: string | null = null;

  private swapToAdminManifest(): void {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) return;
    this.originalManifestHref = link.getAttribute('href');
    link.setAttribute('href', '/manifest.admin.webmanifest');
  }

  private restoreManifest(): void {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (link && this.originalManifestHref) {
      link.setAttribute('href', this.originalManifestHref);
    }
  }

  ngOnDestroy(): void {
    this.restoreManifest();
  }

  ngOnInit(): void {
    this.loadMembershipCatalog();
    const legacyCode = this.getLegacyAccessCodeFromCookie();
    const lastCode = localStorage.getItem('lastLoginCode');
    if (legacyCode) {
      this.code = legacyCode;
    } else if (lastCode) {
      this.code = lastCode;
    }
    this.activatedRoute.queryParamMap.subscribe(params => {
      const code = params.get('code');
      const paid = params.get('paid');
      const adminShortcut = params.get('admin');
      if (code) {
        this.code = code;
      }
      if (paid === '1') {
        this.appToast.success('Tu código ya está activado. Ingresa con el código recibido.', 'Pago confirmado');
      }
      if (adminShortcut === '1') {
        this.swapToAdminManifest();
        sessionStorage.setItem('adminPwaSession', '1');
        this.isAdminPwaSession = true;
        if (this.adminService.isLoggedIn()) {
          this.route.navigate(['/admin-generate-code']);
          return;
        }
        this.loginStep = 'adminCountry';
      }
      const step = params.get('step');
      if (step === 'join') {
        this.loginStep = 'join';
      } else if (step === 'checkout') {
        this.loginStep = 'checkout';
        const planParam = params.get('plan');
        const months = planParam ? parseInt(planParam, 10) : null;
        const countryParam = params.get('country');
        if (countryParam) {
          this.pendingCountryCode = countryParam;
          this.pendingPlanMonths = (months && !isNaN(months)) ? months : null;
          this.applyPendingCheckoutPreset();
        } else if (months && !isNaN(months)) {
          this.purchasePlanMonths = months;
        }
        const emailParam = params.get('email');
        const phoneParam = params.get('phone');
        const provinceParam = params.get('province');
        if (emailParam) this.purchaseEmail = emailParam;
        if (phoneParam) { this.purchasePhone = phoneParam; this.pendingPhone = phoneParam; }
        if (provinceParam) { this.purchaseProvince = provinceParam; this.pendingProvince = provinceParam; }
      }
    });
  }




login(): void {
  const normalizedCode = this.accessCodeService.normalizeCode(this.code);

  if (normalizedCode.length === 0) {
    this.uiDialog.error({ title: 'Error', text: 'Debe ingresar su código' });
    return;
  }

  this.code = normalizedCode;

  this.authService.login(this.code).subscribe(
    response => {
      if (response.email && response.email !== 'Codigo no encontrado' && response.email !== 'Codigo existe pero no asignado a un usuario') {
        this.isAuthenticated = true;
        this.email = response.email;
        this.authService.clearStaleSessionIfNeeded(this.code);
        localStorage.setItem('userCode', this.code);
        localStorage.setItem('userEmail', this.email);
        if (response.sessionToken) localStorage.setItem('sessionToken', response.sessionToken);
        const userData: any = { ...response };
        localStorage.setItem('userData', JSON.stringify(userData));
        this.route.navigate(['dashboard']);
        this.uiDialog.success({ title: 'Éxito', text: 'Login exitoso' });
      } else {
        this.uiDialog.error({ title: 'Error', text: response.email || 'Error al iniciar sesión' });
      }
    },
    error => {
      const storedCode = localStorage.getItem('userCode');
      const cachedUserRaw = localStorage.getItem('userData');

      if (!navigator.onLine && storedCode === this.code && cachedUserRaw) {
        try {
          const cachedUser = JSON.parse(cachedUserRaw);
          this.isAuthenticated = true;
          this.email = cachedUser?.email || localStorage.getItem('userEmail') || '';
          if (this.email) {
            localStorage.setItem('userEmail', this.email);
          }
          this.route.navigate(['dashboard']);
          this.uiDialog.info({ title: 'Modo offline', text: 'Ingresaste con datos guardados localmente.' });
          return;
        } catch {
        }
      }

      if ((error as any).status === 409) {
        this.uiDialog.warning({ title: 'Límite de dispositivos', text: error.message ?? 'Máximo 2 dispositivos activos. Cerrá sesión en otro dispositivo para continuar.' });
        return;
      }
      const serverMsg: string = error.error?.email || error.message || '';
      if (serverMsg === 'Código no encontrado') {
        this.legacyCodeService.checkCode(this.code).subscribe(legacy => {
          if (legacy) {
            this.legacyData = legacy;
            this.email = '';
            this.telefono = '';
            this.provincia = '';
            this.provinciaService.getProvinciasByPais('argentina').subscribe({
              next: ps => this.provincias = ps,
              error: () => this.provincias = this.getCachedProvincias('argentina')
            });
            this.loginStep = 'legacyRegister';
          } else {
            this.uiDialog.error({ title: 'Error', text: 'Código no encontrado.' });
          }
        });
        return;
      }
      this.uiDialog.error({ title: 'Error', text: serverMsg || 'Error al iniciar sesión' });
    }
  );
}

registerLegacy(): void {
  if (!this.email.trim() || !this.telefono.trim() || !this.provincia.trim()) {
    this.uiDialog.error({ title: 'Error', text: 'Completá todos los campos para activar tu código.' });
    return;
  }
  this.legacyCodeService.claimAndActivate(this.code, this.email.trim(), this.telefono.trim(), this.provincia.trim()).subscribe({
    next: (resp) => {
      localStorage.setItem('userCode', resp.code);
      localStorage.setItem('userEmail', resp.email);
      localStorage.setItem('userData', JSON.stringify(resp));
      this.uiDialog.success({ title: '¡Bienvenido!', text: 'Tu código fue activado correctamente.' });
      this.route.navigate(['dashboard']);
    },
    error: (err) => {
      const msg = err?.error?.message || err?.message || 'No se pudo activar el código.';
      this.uiDialog.error({ title: 'Error', text: msg });
    }
  });
}



  reactivate(): void {
    const normalizedNew = this.accessCodeService.normalizeCode(this.reactivateNewCode);
    if (!normalizedNew) {
      this.uiDialog.error({ title: 'Error', text: 'Ingresá el nuevo código.' });
      return;
    }
    if (!this.reactivateEmail.trim()) {
      this.uiDialog.error({ title: 'Error', text: 'Ingresá tu email para confirmar tu identidad.' });
      return;
    }
    this.authService.reactivate(this.expiredCode, normalizedNew, this.reactivateEmail.trim()).subscribe({
      next: (newAc) => {
        this.authService.clearStaleSessionIfNeeded(newAc.code);
        localStorage.setItem('userCode', newAc.code);
        localStorage.setItem('userEmail', newAc.email!);
        localStorage.setItem('userData', JSON.stringify(newAc));
        this.uiDialog.success({ title: '¡Reactivado!', text: 'Tus datos fueron recuperados con éxito.' });
        this.route.navigate(['dashboard']);
      },
      error: (err) => {
        const msg = err?.message || 'No se pudo reactivar la sesión.';
        this.uiDialog.error({ title: 'Error', text: msg });
      }
    });
  }

  register(): void {
    if (!this.isCountryAvailable(this.pais)) {
      this.uiDialog.warning({ title: 'País no disponible', text: 'Por ahora solo está disponible Argentina.' });
      this.pais = null;
      this.provincia = '';
      this.provincias = [];
      this.validateForm();
      return;
    }

    this.validateForm();
    if (!this.isFormValid) {
      this.uiDialog.error({ title: 'Error', text: this.codeCountryErrorMessage || this.telefonoErrorMessage || 'Completa correctamente los datos del registro.' });
      return;
    }

    if (!navigator.onLine) {
      this.uiDialog.info({ title: 'Sin conexión', text: 'El registro requiere internet para validar el código y asociar tus datos.' });
      return;
    }

    const normalizedCode = this.accessCodeService.normalizeCode(this.code);

    this.accessCodeService.getCodeCountry(normalizedCode).subscribe({
      next: async (detectedCountry) => {
        this.code = normalizedCode;
        this.codeCountry = detectedCountry;
        this.codeCountryErrorMessage = this.getCodeCountryMismatchMessage();

        if (this.codeCountryErrorMessage) {
          this.validateForm();
          this.uiDialog.error({ title: 'Error', text: this.codeCountryErrorMessage });
          return;
        }

        const confirmed = await this.uiDialog.confirm({
          title: 'Confirmar registro',
          text: `¿Confirmas registrar el correo "${this.email}" con el código "${this.code}"?`,
          confirmText: 'Registrar',
          cancelText: 'Cancelar'
        });
        if (!confirmed) return;

        this.authService.assignEmail({
          code: this.code,
          email: this.email,
          telefono: this.telefono,
          pais: this.pais || '',
          provincia: this.provincia
        }).subscribe({
          next: response => {
            this.uiDialog.success({ title: '¡Éxito!', text: response.message });
            this.clearForm();
            this.loginStep = 'login';
          },
          error: err => {
            const msg = err?.error?.message || err?.message || 'Error al registrar. Intentá de nuevo.';
            this.uiDialog.error({ title: 'Error', text: msg });
          }
        });
      },
      error: (error) => {
        this.uiDialog.error({ title: 'Error', text: error.message || 'No se pudo validar el código.' });
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
      this.isCountryAvailable(this.pais) &&
      !this.codeCountryErrorMessage;
    }




   getProvincias(): void {
    this.provinciaService.getAllProvincias().subscribe(
      response => {
        this.provincias = response;
      },
      error => {
        const cached = this.getCachedProvincias(this.pais);
        if (cached.length > 0) {
          this.provincias = cached;
          return;
        }
        this.uiDialog.error({ title: 'Error', text: 'Error al cargar las provincias' });
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
          this.cacheProvincias(this.pais || '', response);
        },
        error => {
          const cached = this.getCachedProvincias(this.pais);
          if (cached.length > 0) {
            this.provincias = cached;
            return;
          }
          this.uiDialog.error({ title: 'Error', text: 'Error al cargar las provincias' });
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
    if (this.code.length === 5 || this.code.length === 6) {
      this.syncCountryWithCode(false);
    }
  }

  enterRegisterStep(): void {
    this.loginStep = 'register';
    const normalized = this.accessCodeService.normalizeCode(this.code);
    if (normalized.length === 5 || normalized.length === 6) {
      this.code = normalized;
      this.syncCountryWithCode(false);
    }
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
          this.appToast.error(
            !navigator.onLine
              ? 'Sin conexión. No se pudo validar el código.'
              : error?.message || 'No se pudo validar el código.'
          );
        }
      }
    });
  }


    ocultarContenido(): void {
    this.isContentVisible = false;
  }

  isCountryAvailable(pais: string | null | undefined): boolean {
    return !!pais && !this.unavailableCountries.has(pais.trim().toLowerCase());
  }

  isDemoCountryAvailable(pais: string): boolean {
    return this.isCountryAvailable(pais);
  }

  get registrationCountries(): Country[] {
    return this.countries.filter(country => this.isCountryAvailable(country.nombre));
  }

  activarModoPrueba(pais: string = 'Argentina'): void {
  if (!this.isCountryAvailable(pais)) {
    this.appToast.info(`${pais} estará disponible próximamente.`);
    return;
  }

  ['demoEmpresas', 'demoTareas', 'selectedEmpresaId', 'selectedEmpresa',
   'selectedClienteId', 'selectedCliente', 'tareasAgregadas', 'userData']
    .forEach(k => localStorage.removeItem(k));
  Object.keys(localStorage)
    .filter(k => k.startsWith('demoCliente_') || k.startsWith('demoTareasCliente_'))
    .forEach(k => localStorage.removeItem(k));

  localStorage.setItem('trialMode', 'true');
  localStorage.setItem('userCode', 'demo');
  localStorage.setItem('demoPais', pais);
  localStorage.setItem('demoStartedAt', String(Date.now()));
  window.dispatchEvent(new CustomEvent('metro-demo-entered'));
  this.route.navigate(['dashboard']);
}



volverDesdeCheckout(): void {
  const storedCode = localStorage.getItem('userCode');
  if (storedCode && storedCode !== 'demo') {
    this.route.navigate(['/dashboard']);
  } else if (localStorage.getItem('trialMode') === 'true') {
    this.route.navigate(['/dashboard']);
  } else {
    this.loginStep = 'join';
  }
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

pedirCodigoPorWhatsApp(): void {
  const phone = '5491128634744';
  const text = 'Quiero mi código de acceso para la web';
  const nativeUrl  = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`;
  const fallbackUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
  window.location.href = nativeUrl;
  setTimeout(() => { window.location.href = fallbackUrl; }, 1500);
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

    private applyPendingCheckoutPreset(): void {
      if (!this.pendingCountryCode || this.membershipCountries.length === 0) return;
      this.purchaseCountryCode = this.pendingCountryCode;
      this.pendingCountryCode = null;
      const phone = this.pendingPhone || this.purchasePhone || null;
      const province = this.pendingProvince || this.purchaseProvince || null;
      this.onPurchaseCountryChange();
      // onPurchaseCountryChange() limpia phone y province — los restauramos
      if (phone) {
        this.purchasePhone = phone;
        const matched = PHONE_COUNTRIES.find(c => phone.startsWith(c.code));
        if (matched) {
          this.purchasePhonePrefix = matched.code;
          this.purchasePhoneNumber = phone.slice(matched.code.length);
        } else {
          this.purchasePhoneNumber = phone;
        }
      }
      if (province) this.purchaseProvince = province;
      this.pendingPhone = null;
      this.pendingProvince = null;
      if (this.pendingPlanMonths) {
        this.purchasePlanMonths = this.pendingPlanMonths;
        this.pendingPlanMonths = null;
      }
    }

    loadMembershipCatalog(): void {
      this.isLoadingCatalog = true;
      this.membershipPaymentService.getCatalog().subscribe({
        next: (catalog) => {
          this.membershipCountries = Object.entries(catalog.countries)
            .map(([countryCode, country]) => mapMembershipCountryOption(countryCode, country, this.countries))
            .sort((left, right) => left.nombre.localeCompare(right.nombre));
          this.cacheMembershipCatalog(this.membershipCountries);
          this.isLoadingCatalog = false;
          this.applyPendingCheckoutPreset();
        },
        error: () => {
          const cachedCatalog = this.getCachedMembershipCatalog();
          if (cachedCatalog.length > 0) {
            this.membershipCountries = cachedCatalog;
            this.isLoadingCatalog = false;
            this.appToast.info('Mostrando el catálogo guardado localmente.');
            this.applyPendingCheckoutPreset();
            return;
          }
          this.isLoadingCatalog = false;
          this.appToast.error(
            navigator.onLine
              ? 'No se pudo cargar el catálogo de membresías.'
              : 'Sin conexión. El catálogo de membresías no está disponible todavía en este dispositivo.'
          );
        }
      });
    }

    onPurchaseCountryChange(): void {
      this.purchaseProvince = '';
      this.purchaseDocument = '';
      this.purchasePhone = '';
      this.purchasePhoneNumber = '';
      this.purchasePhoneErrorMessage = '';
      this.purchasePhonePrefix = this.getPhonePrefixByCountryCode(this.purchaseCountryCode);
      this.purchasePlanMonths = this.selectedMembershipCountry?.plans[0]?.months ?? null;
      if (!this.purchaseCountryCode) {
        this.purchaseProvincias = [];
        return;
      }
      this.provinciaService.getProvinciasByPais(this.selectedMembershipCountry?.nombre || this.purchaseCountryCode).subscribe({
        next: (provincias) => {
          this.purchaseProvincias = provincias;
          this.cacheProvincias(this.selectedMembershipCountry?.nombre || this.purchaseCountryCode || '', provincias);
        },
        error: () => {
          const cacheKey = this.selectedMembershipCountry?.nombre || this.purchaseCountryCode || null;
          const cached = this.getCachedProvincias(cacheKey);
          if (cached.length > 0) {
            this.purchaseProvincias = cached;
            return;
          }
          this.purchaseProvincias = [];
          this.appToast.error('No se pudieron cargar las provincias para la compra.');
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
        this.uiDialog.warning({ title: 'Faltan datos', text: this.purchasePhoneErrorMessage || 'Completa los datos para iniciar el pago.' });
        return;
      }

      if (!navigator.onLine) {
        this.uiDialog.info({ title: 'Sin conexión', text: 'El checkout requiere internet para conectarse con la pasarela de pago.' });
        return;
      }

      this.isStartingCheckout = true;
      this.membershipPaymentService.createCheckout(
        buildMembershipCheckoutPayload(this.purchaseCheckoutForm, `${window.location.origin}/payment-result`)
      ).subscribe({
        next: (order) => {
          this.isStartingCheckout = false;
          if (!order.redirectUrl) {
            this.appToast.error('La pasarela no devolvió una URL de pago.');
            return;
          }
          localStorage.setItem('pendingPaymentId', order.externalId);
          window.location.href = order.redirectUrl;
        },
        error: (error) => {
          this.isStartingCheckout = false;
          this.uiDialog.error({ title: 'Error', text: this.getCheckoutErrorMessage(error, 'No se pudo iniciar el checkout.') });
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
        this.uiDialog.warning({ title: 'Faltan datos', text: this.purchasePhoneErrorMessage || 'Completa los datos para iniciar el pago.' });
        return;
      }

      if (!navigator.onLine) {
        this.uiDialog.info({ title: 'Sin conexión', text: 'El checkout con PayPal requiere internet para conectarse con la pasarela de pago.' });
        return;
      }

      this.isStartingPayPal = true;
      this.payPalPaymentService.createCheckout(
        buildPayPalCheckoutPayload(this.purchaseCheckoutForm, `${window.location.origin}/payment-result`)
      ).subscribe({
        next: (order) => {
          this.isStartingPayPal = false;
          if (!order.approvalUrl) {
            this.appToast.error('PayPal no devolvió una URL de pago.');
            return;
          }
          localStorage.setItem('pendingPaymentId', order.externalId);
          window.location.href = order.approvalUrl;
        },
        error: (error) => {
          this.isStartingPayPal = false;
          this.uiDialog.error({ title: 'Error', text: this.getCheckoutErrorMessage(error, 'No se pudo iniciar el checkout con PayPal.') });
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

    onPurchasePhoneNumberInput(): void {
      this.purchasePhoneNumber = sanitizePhoneInput(this.purchasePhoneNumber);
      this.purchasePhone = this.purchasePhoneNumber.trim()
        ? `${this.purchasePhonePrefix}${this.purchasePhoneNumber}`
        : '';
      this.purchasePhoneErrorMessage = validateMembershipCheckoutForm(
        this.purchaseCheckoutForm,
        this.selectedMembershipCountry?.nombre || null
      ).phoneMessage;
    }

    get purchasePhoneNumberPlaceholder(): string {
      return PHONE_COUNTRIES.find(c => c.code === this.purchasePhonePrefix)?.placeholder
        ?? 'Ej: 1134567890';
    }

    get purchaseEmailError(): string | null {
      if (!this.purchaseEmailTouched || !this.purchaseEmail.trim()) return null;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(this.purchaseEmail.trim()) ? null : 'Ingresá un email válido.';
    }

    private getPhonePrefixByCountryCode(code: string | null): string {
      const prefixes: Record<string, string> = { AR: '+549', CO: '+57', UY: '+598' };
      return prefixes[code ?? ''] ?? '+549';
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
      this.adminService.setReturnUrl(this.route.url);
      this.route.navigate(['/admin-generate-code']);
      return;
    }
    this.selectedAdminPais = pais;
    this.adminUsername = '';
    this.adminPassword = '';
    this.adminLoginError = '';
    this.loginStep = 'adminLogin';
  }

  volverDesdeAdminLogin(): void {
    this.adminPassword = '';
    this.adminLoginError = '';
    this.showAdminPassword = false;
    this.loginStep = 'adminCountry';
  }

  volverDesdeAdminCountry(): void {
    this.selectedAdminPais = null;
    this.adminUsername = '';
    this.adminPassword = '';
    this.adminLoginError = '';
    this.showAdminPassword = false;
    this.loginStep = 'home';

    const returnUrl = this.adminService.consumeReturnUrl();
    if (returnUrl && returnUrl !== '/admin-generate-code') {
      this.route.navigateByUrl(returnUrl);
      return;
    }

    this.route.navigate(['/'], { replaceUrl: true });
  }

  salirModoAdmin(): void {
    this.selectedAdminPais = null;
    this.adminUsername = '';
    this.adminPassword = '';
    this.adminLoginError = '';
    this.showAdminPassword = false;
    this.loginStep = 'home';
    this.route.navigate(['/'], { replaceUrl: true });
  }

  adminLogin(): void {
    this.adminLoginError = '';
    this.adminService.loginForCountry(this.adminUsername, this.adminPassword, this.selectedAdminPais).subscribe(result => {
      if (result.error) {
        this.adminLoginError = result.error;
        return;
      }
      this.adminService.setReturnUrl(this.route.url);
      this.route.navigate(['/admin-generate-code']);
    });
  }

}
