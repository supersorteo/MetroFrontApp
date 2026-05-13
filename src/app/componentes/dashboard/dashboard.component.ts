import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, AfterViewInit, HostListener, effect, inject } from '@angular/core';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../servicios/auth.service';
import { Router, RouterModule } from '@angular/router';
import { Tarea, TareaService } from '../../servicios/tarea.service';
import { Provincia, ProvinciaService } from '../../servicios/provincia.service';
import { UserTarea, UserTareaService } from '../../servicios/user-tarea.service';
import { PresupuestoService } from '../../servicios/presupuesto.service';
import { Empresa, EmpresaService } from '../../servicios/empresa.service';
import { Cliente, ClienteService } from '../../servicios/cliente.service';
import { UiDialogService } from '../../core/services/ui-dialog.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { FilterClientePipe } from '../../pipes/filter-cliente.pipe';
import { FilterEmpresaPipe } from '../../pipes/filter-empresa.pipe';
import { PresupuestosGuardadosComponent } from '../presupuestos-guardados/presupuestos-guardados.component';

import { firstValueFrom } from 'rxjs';
//import { SavedPresupuesto } from '../../servicios/budget-storage.service';
import { SavedPresupuesto } from '../../servicios/budget.service';
import { OfflineSyncService, PendingSyncSummary } from '../../servicios/offline-sync.service';
import { OfflineLocalStoreService } from '../../servicios/offline-local-store.service';
import { EmpresaStore } from '../../stores/empresa.store';
import { ClienteStore } from '../../stores/cliente.store';
import { UserTareaStore } from '../../stores/user-tarea.store';
import { TareaPersonalizadaService, TareaPersonalizada } from '../../servicios/tarea-personalizada.service';
import { AppToastService } from '../../servicios/app-toast.service';


declare var bootstrap: any;
declare var QRCodeStyling: any;

interface AccessCode {
  code: string;
  email: string;
  username: string;
  telefono: string;
  provincia: string;
  fechaRegistro: string;
  fechaVencimiento: string;
}

interface ColorScheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  tableTextColor: string;
}


function cleanupBootstrapModals(): void {
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
  document.querySelectorAll('.modal.show').forEach(el => {
    el.classList.remove('show');
    (el as HTMLElement).style.display = 'none';
  });
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    RouterModule,
    NgSelectModule,
    FilterClientePipe,
    FilterEmpresaPipe,
    PresupuestosGuardadosComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  deferredPrompt: any;

  filtroCliente: string = '';
  filtroEmpresa: string = '';
  selectedEmpresaId: any = null;
  selectedEmpresa: Empresa | null = null;
  empresaEditId: number | null = null; // ID de empresa en edición
  // --- EMPRESAS ---

  empresas: Empresa[] = [];
  paginatedEmpresas: Empresa[] = [];
  currentEmpresaPage: number = 1;
  itemsPerPageEmpresas: number = 5;
  totalEmpresaPages: number = 1;

  clienteSeleccionado: Cliente | null = null;

  clienteAEliminar: number | null = null;
  mostrarModalConfirmacion = false;

  tareaAEliminar: number | null = null;
  tareaDescripcionAEliminar: string | null = null;

  // --- COLORES PRESUPUESTO ---
  presupuestoColorPrimario: string = '#0b69a6';
  presupuestoColorSecundario: string = '#f0f4fa';
  presupuestoColorSecundario2: string = '#f0f4fa';
  presupuestoGradienteAngulo: string = 'to bottom';
  presupuestoColorTexto: string = '#333333';
  presupuestoColorTabla: string = '#343a40';
  presupuestoColorTablaTexto: string = '#ffffff';
  presupuestoColorTablaCuerpo: string = '#ffffff';
  presupuestoInfoBoxColorHex: string = '#f8f9fa';
  presupuestoInfoBoxOpacity: number = 1;

  getBackgroundColorRgba(hex: string, alpha: number): string {
    if (!hex || hex.length < 7) return `rgba(248, 249, 250, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const red = isNaN(r) ? 248 : r;
    const green = isNaN(g) ? 249 : g;
    const blue = isNaN(b) ? 250 : b;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(e: any) {
    // Previene que se muestre el banner por defecto del navegador
    e.preventDefault();
    // Guarda el evento para poder dispararlo después
    this.deferredPrompt = e;
  }

  toggleMenuPanel(): void {
    this.showMenuPanel = !this.showMenuPanel;
    if (this.showMenuPanel) {
      this.refreshPendingSyncSummary();
    }
  }

  installPwa() {
    if (!this.deferredPrompt) {
      return;
    }
    // Muestra el prompt de instalación
    this.deferredPrompt.prompt();
    // Espera la respuesta del usuario
    this.deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      } else {
        console.log('User dismissed the A2HS prompt');
      }
      this.deferredPrompt = null;
    });
  }

  editarCliente(id: number) {
    this.route.navigate([`/editar-clientes`, id]);
  }

  editarEmpresa(id: number) {
    this.route.navigate([`/editar-empresa`, id]);
  }


  isSavingClient = false;
  private reabrirEmpresaModal = false;
  // Control de modales para empresa e imagen

  empresaName: string = '';
  empresaPhone: string = '';
  empresaEmail: string = '';
  additionalDetailsEmpresa: string = '';
  empresaWebsite: string = '';
  empresaTikTok: string = '';
  empresaInstagram: string = '';
  empresaFacebook: string = '';
  empresaCuilCuit: string = '';
  clientName: string = '';
  clientContact: string = '';
  budgetDate: any = '';
  additionalDetailsClient: string = '';

  clientEmail: string = '';
  clientClave: string = '';
  clientDireccion: string = '';
  porcentajeBajar!: any;
  porcentajeSubir!: any ;


  userCode: string = '';
  userData: any | null = null;
  remainingTime: string = '';

  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('modalImagePreview') modalImagePreview!: ElementRef<HTMLImageElement>;
  @ViewChild('uploadMessage') uploadMessage!: ElementRef<HTMLParagraphElement>;
  imageSelected: boolean = false;

  tareas: Tarea[] = [];
  tareasFiltradas: Tarea[] = [];

  mostrarTabla: boolean = false;
  showSavedBudgetsPanel: boolean = false;
  showTareasPanel: boolean = false;
  activeTaskTab: 'catalogo' | 'personalizadas' = 'catalogo';
  showTareasPersonalizadasPanel: boolean = false;
  showTpEditorModal: boolean = false;
  tareasPersonalizadas: TareaPersonalizada[] = [];
  tpEditingId: number | null = null;
  tpForm = { tarea: '', descripcion: '', costo: 0 };
  tpSubmitted = false;
  tpMostrarImportar: boolean = false;
  tpFiltroCatalogo: string = '';
  tpBusquedaPersonalizada: string = '';
  tareasAgregadas: UserTarea[] = [];
  tareasDelCliente: UserTarea[] = [];
  showMenuPanel: boolean = false;
  showSocialFields: boolean = false;
  weatherLoading: boolean = false;
  weatherError: string = '';
  pendingSyncSummary: PendingSyncSummary = {
    total: 0,
    empresa: 0,
    cliente: 0,
    userTarea: 0,
    presupuesto: 0,
    calculoMaterial: 0,
    empresaLogo: 0
  };
  currentWeather: { temperature: number; windspeed: number; weathercode: number; location: string } | null = null;
  dailyForecast: { date: Date; max: number; min: number; code: number }[] = [];
  colorSchemeMessageVisible = false;
  readonly defaultColorScheme: ColorScheme = {
    primaryColor: '#409eff',
    secondaryColor: '#deecea',
    accentColor: '#5d8eea',
    textColor: '#0b69a6',
    tableTextColor: '#132d6b'
  };
  colorScheme: ColorScheme = { ...this.defaultColorScheme };
  private readonly colorSchemeStorageKey = 'metroColorScheme';


    tareaSeleccionada: Tarea = {
    tarea: '',
    costo: 0,
    rubro: '',
    categoria: '',
    pais: '',
    descripcion: '',
    descuento: 0,
    area: 1,
    totalCost: 0
  };

  provincias: Provincia[] = []; // Nuevo
  provinciaSeleccionada: string = '';

  isContentVisible: boolean = false;
  showAjustesListaInfo: boolean = false;
  tareasAgregadasUser: UserTarea[] = [];
  clientes: Cliente[] = [];

  paginatedClientes: Cliente[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 1;

  tareasCurrentPage: number = 1;
  tareasTotalPages: number = 1;
  readonly TAREAS_PANEL_PAGE_SIZE = 5;
  tareasAgregadasPaginadas: UserTarea[] = [];

  recentTasks: any[] = []; // Property to store the last 10 tasks

  logoUrl: string = '';
  currentEmpresaLogoUrl: string = '';
  empresaLogoUrls: Record<string, string> = {};
  trialMode: boolean = false;

  private demoTareasKey(clienteId: number | null | undefined): string {
  return `demoTareasCliente_${clienteId ?? 'sinCliente'}`;
}

  private authTareasKey(clienteId: number | null | undefined): string {
    return `authTareasCliente_${clienteId ?? 'sinCliente'}`;
  }

  private dashboardStateKey(name: string): string {
    return `dashboard:${this.userCode || 'anon'}:${name}`;
  }

  private provinciasCacheKey(pais: string | null | undefined): string {
    return `provincias_${(pais || 'sin-pais').toLowerCase()}`;
  }

  private weatherCacheKey(location: string | null | undefined): string {
    return `weather_${(location || 'sin-ubicacion').toLowerCase()}`;
  }

presupuestoSeleccionado: SavedPresupuesto | null = null;
private presupuestoPendiente: SavedPresupuesto | null = null;

  // Variables QR
  qrCode: any = null;
  qrLogoUrlValue: string = '';

  private getStoredAuthTasks(clienteId: number | null | undefined): UserTarea[] {
    const key = this.authTareasKey(clienteId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private async getStoredAuthTasksLocal(clienteId: number | null | undefined): Promise<UserTarea[]> {
    if (!clienteId) {
      return [];
    }

    const indexedTasks = await this.localStore.listUserTareasByClienteId(clienteId);
    if (indexedTasks.length > 0) {
      return indexedTasks as UserTarea[];
    }

    return this.getStoredAuthTasks(clienteId);
  }

  private applyCurrentTasks(tareas: UserTarea[]): void {
    this.tareasAgregadas = tareas;
    this.actualizarTablaYStorage();
  }

  private clearVisibleTasks(): void {
    this.tareasAgregadas = [];
    this.tareasAgregadasPaginadas = [];
    this.tareasCurrentPage = 1;
    this.mostrarTabla = false;
    this.showTareasPanel = false;
    this.presupuestoService.setTareasAgregadas([]);
  }

  private clearEmpresaDependentState(): void {
    this.presupuestoSeleccionado = null;
    this.presupuestoPendiente = null;
    this.clienteSeleccionado = null;
    this.currentEmpresaLogoUrl = '';
    this.clientes = [];
    this.updatePaginatedClientes();
    this.clearVisibleTasks();
    localStorage.removeItem('selectedTareas');
    localStorage.removeItem('presupuestoCargado');
    localStorage.removeItem('selectedPresupuestoName');
    void this.localStore.removeState('budget:active-preview').catch(() => {});

    if (this.trialMode) {
      this.syncSelectedClienteStorage();
      return;
    }

    this.syncSelectedClienteStorage();
    this.clienteStore.select(null);
  }

  compareEmpresaById(a: Empresa | null | undefined, b: Empresa | null | undefined): boolean {
    return Number(a?.id) === Number(b?.id);
  }

  private empresaLogoKey(empresa: any): string | null {
    const key = empresa?.id ?? empresa?.localId;
    return key != null ? String(key) : null;
  }

  getEmpresaDisplayLogo(empresa: any): string {
    const key = this.empresaLogoKey(empresa);
    return (key && this.empresaLogoUrls[key]) || String(empresa?.logoUrl || '');
  }

  private normalizeEmpresaSelection(empresa: Empresa | number | null | undefined): Empresa | null {
    if (empresa == null) {
      return null;
    }

    if (typeof empresa === 'object') {
      return empresa;
    }

    return this.empresas.find(item => Number(item.id) === Number(empresa)) ?? null;
  }

  private syncSelectedClienteStorage(): void {
    if (this.clienteSeleccionado?.id != null) {
      localStorage.setItem('selectedClienteId', String(this.clienteSeleccionado.id));
      localStorage.setItem('selectedCliente', JSON.stringify(this.clienteSeleccionado));
      this.localStore.setState(this.dashboardStateKey('selectedCliente'), this.clienteSeleccionado);
      return;
    }

    localStorage.removeItem('selectedClienteId');
    localStorage.removeItem('selectedCliente');
    this.localStore.removeState(this.dashboardStateKey('selectedCliente'));
  }

  private syncSelectedEmpresaStorage(empresa: Empresa | null): void {
    if (empresa?.id != null) {
      localStorage.setItem('selectedEmpresaId', String(empresa.id));
      localStorage.setItem('selectedEmpresa', JSON.stringify(empresa));
      this.localStore.setState(this.dashboardStateKey('selectedEmpresa'), empresa);
      return;
    }

    localStorage.removeItem('selectedEmpresaId');
    localStorage.removeItem('selectedEmpresa');
    this.localStore.removeState(this.dashboardStateKey('selectedEmpresa'));
  }

  private finishClientSaveFlow(message: string): void {
    this.clientName = '';
    this.clientContact = '';
    this.budgetDate = new Date().toISOString().split('T')[0];
    this.additionalDetailsClient = '';
    this.clientEmail = '';
    this.clientClave = '';
    this.clientDireccion = '';

    const confirmationMessage = document.getElementById('confirmationMessage');
    if (confirmationMessage) {
      confirmationMessage.style.display = 'block';
      setTimeout(() => confirmationMessage.style.display = 'none', 3000);
    }

    const modal = bootstrap.Modal.getInstance(document.getElementById('clientModal'));
    modal?.hide();
    this.isSavingClient = false;
    this.appToast.success(message);
  }

  private applySavedCliente(cliente: Cliente): void {
    const normalized = { ...cliente };
    const index = this.clientes.findIndex(item => item.id === normalized.id);

    if (index >= 0) {
      this.clientes[index] = normalized;
    } else {
      this.clientes = [...this.clientes, normalized];
    }

    this.updatePaginatedClientes();
    if (this.trialMode) {
      this.clearVisibleTasks();
      this.clienteSeleccionado = normalized;
      this.syncSelectedClienteStorage();
      return;
    }

    this.clearVisibleTasks();
    this.clienteStore.select(normalized);
  }

  private applySavedEmpresa(empresa: Empresa): void {
    const normalized = { ...empresa };
    const index = this.empresas.findIndex(item => item.id === normalized.id);

    if (index >= 0) {
      this.empresas[index] = normalized;
    } else {
      this.empresas = [...this.empresas, normalized];
    }

    this.updatePaginatedEmpresas();
    if (this.trialMode) {
      this.selectedEmpresaId = normalized;
      this.syncSelectedEmpresaStorage(normalized);
      this.cargarDatosEmpresaSeleccionada();
      this.actualizarImagenEmpresa(normalized);
      return;
    }

    this.clearEmpresaDependentState();
    this.syncSelectedEmpresaStorage(normalized);
    this.empresaStore.select(normalized);
  }

  private removeClienteFromState(id: number): void {
    this.clientes = this.clientes.filter(cliente => cliente.id !== id);

    if (this.clienteSeleccionado?.id === id) {
      this.clienteSeleccionado = null;
      this.syncSelectedClienteStorage();
      this.applyCurrentTasks([]);
      localStorage.removeItem('selectedTareas');
      localStorage.removeItem('presupuestoCargado');
      localStorage.removeItem('selectedPresupuestoName');
      this.presupuestoSeleccionado = null;
    }

    if (this.paginatedClientes.length === 1 && this.currentPage > 1) {
      this.currentPage--;
    }

    this.updatePaginatedClientes();
  }

  private removeEmpresaFromState(id: number): void {
    this.empresas = this.empresas.filter(empresa => empresa.id !== id);

    if (this.selectedEmpresaId?.id === id) {
      this.selectedEmpresaId = null;
      this.clienteSeleccionado = null;
      this.syncSelectedClienteStorage();
      this.clientes = [];
      this.applyCurrentTasks([]);
      localStorage.removeItem('selectedEmpresaId');
      localStorage.removeItem('selectedEmpresa');
      localStorage.removeItem('selectedTareas');
      localStorage.removeItem('presupuestoCargado');
      localStorage.removeItem('selectedPresupuestoName');
      this.presupuestoSeleccionado = null;
      this.cargarDatosEmpresaSeleccionada();
      this.actualizarImagenEmpresa(null);
      this.updatePaginatedClientes();
    }

    this.updatePaginatedEmpresas();
  }

  private cacheProvincias(pais: string, provincias: Provincia[]): void {
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

  private cacheWeather(location: string, payload: {
    currentWeather: { temperature: number; windspeed: number; weathercode: number; location: string } | null;
    dailyForecast: { date: Date; max: number; min: number; code: number }[];
  }): void {
    localStorage.setItem(this.weatherCacheKey(location), JSON.stringify(payload));
  }

  private getCachedWeather(location: string | null | undefined): {
    currentWeather: { temperature: number; windspeed: number; weathercode: number; location: string } | null;
    dailyForecast: { date: Date; max: number; min: number; code: number }[];
  } | null {
    if (!location) {
      return null;
    }

    try {
      const raw = localStorage.getItem(this.weatherCacheKey(location));
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      return {
        currentWeather: parsed.currentWeather ?? null,
        dailyForecast: Array.isArray(parsed.dailyForecast)
          ? parsed.dailyForecast.map((item: any) => ({
              date: new Date(item.date),
              max: item.max,
              min: item.min,
              code: item.code
            }))
          : []
      };
    } catch {
      return null;
    }
  }

private async resolveEmpresaLogoUrl(empresa: any): Promise<string> {
    if (!empresa) {
      return '';
    }

    const directLogo = String(empresa.logoUrl || '');
    if (directLogo.startsWith('data:image/')) {
      return directLogo;
    }

    const localLogo = await this.localStore.getEmpresaLogoUrl({
      empresaId: Number(empresa.id),
      userCode: empresa.userCode || this.userCode,
      currentLogoUrl: directLogo
    });

    return localLogo || directLogo;
  }

  private _empresaLogoListToken: symbol | null = null;

  private async refreshEmpresaLogoUrls(empresas: Empresa[]): Promise<void> {
    if (!empresas.length) {
      this.empresaLogoUrls = {};
      return;
    }

    const token = Symbol();
    this._empresaLogoListToken = token;

    const entries = await Promise.all(
      empresas.map(async empresa => {
        const key = this.empresaLogoKey(empresa);
        const resolved = await this.resolveEmpresaLogoUrl(empresa);
        return [key, resolved || String(empresa?.logoUrl || '')] as const;
      })
    );

    if (this._empresaLogoListToken !== token) return;

    const next: Record<string, string> = {};
    for (const [key, logo] of entries) {
      if (key) {
        next[key] = logo;
      }
    }

    this.empresaLogoUrls = next;
  }

  // Reemplazado por EmpresaStore + ClienteStore + UserTareaStore (liveQuery reactivo)

  private applyImageUrl(url: string): void {
    this.logoUrl = url;
    this.currentEmpresaLogoUrl = url;

    if (this.selectedEmpresaId) {
      this.selectedEmpresaId = {
        ...this.selectedEmpresaId,
        logoUrl: url
      };
      localStorage.setItem('selectedEmpresa', JSON.stringify(this.selectedEmpresaId));
      localStorage.setItem('selectedEmpresaId', String(this.selectedEmpresaId.id));
      const logoKey = this.empresaLogoKey(this.selectedEmpresaId);
      if (logoKey) {
        this.empresaLogoUrls = {
          ...this.empresaLogoUrls,
          [logoKey]: url
        };
      }

      if (this.trialMode) {
        const demoEmpresasRaw = localStorage.getItem('demoEmpresas');
        const demoEmpresas = demoEmpresasRaw ? JSON.parse(demoEmpresasRaw) : [];
        const idx = demoEmpresas.findIndex((empresa: any) => empresa.id === this.selectedEmpresaId?.id);
        if (idx !== -1) {
          demoEmpresas[idx] = {
            ...demoEmpresas[idx],
            logoUrl: url
          };
          localStorage.setItem('demoEmpresas', JSON.stringify(demoEmpresas));
        }
      }
    }

    const modalPreview = this.modalImagePreview?.nativeElement as HTMLImageElement | undefined;
    if (modalPreview) {
      modalPreview.src = url;
      modalPreview.style.display = 'block';
    }

    const mainPreview = document.getElementById('fixedImageIcon') as HTMLImageElement;
    const mainPreview2 = document.getElementById('fixedImageIconmodal') as HTMLImageElement;
    if (mainPreview) {
      mainPreview.src = url;
      mainPreview.style.display = 'block';
    }
    if (mainPreview2) {
      mainPreview2.src = url;
      mainPreview2.style.display = 'block';
    }

    if (this.uploadMessage) {
      this.uploadMessage.nativeElement.style.display = 'block';
    }
  }



  readonly empresaStore = inject(EmpresaStore);
  readonly clienteStore = inject(ClienteStore);
  readonly userTareaStore = inject(UserTareaStore);

  constructor(
    private authService: AuthService,
    private route:Router,
    private tareaService: TareaService,
    private provinciaService: ProvinciaService,
    private userTareaService: UserTareaService,
    private presupuestoService: PresupuestoService,
    private empresaService: EmpresaService,
    private clienteService: ClienteService,
    private http: HttpClient,
    readonly offlineSync: OfflineSyncService,
    private localStore: OfflineLocalStoreService,
    private tpService: TareaPersonalizadaService,
    private appToast: AppToastService,
    private uiDialog: UiDialogService
  ) {
    // Sync empresas IDB → lista local + paginación
    effect(() => {
      if (this.trialMode) return;
      this.empresas = this.empresaStore.empresas();
      this.updatePaginatedEmpresas();
      void this.refreshEmpresaLogoUrls(this.empresas);
    });

    // Sync empresa seleccionada → formulario + imagen
    effect(() => {
      if (this.trialMode) return;
      const empresa = this.empresaStore.selected();
      this.selectedEmpresaId = empresa;
      this.cargarDatosEmpresaSeleccionada();
      void this.actualizarImagenEmpresa(empresa);
    });

    // Sync clientes IDB → lista local + paginación
    effect(() => {
      if (this.trialMode) return;
      this.clientes = this.clienteStore.clientes();
      this.updatePaginatedClientes();
    });

    // Sync cliente seleccionado → estado local + presupuesto pendiente
    effect(() => {
      if (this.trialMode) return;
      this.clienteSeleccionado = this.clienteStore.selected();
      if (!this.clienteSeleccionado || !this.presupuestoPendiente) return;
      const mismoCliente =
        this.presupuestoPendiente.cliente?.id &&
        this.presupuestoPendiente.cliente.id === this.clienteSeleccionado.id;
      if (mismoCliente) {
        void this.aplicarPresupuestoGuardado(this.presupuestoPendiente, {
          scrollToTable: false
        });
        this.presupuestoPendiente = null;
      }
    });

    // Sync user-tareas IDB → tareasAgregadas (solo modo autenticado)
    effect(() => {
      if (this.trialMode) return;
      this.tareasAgregadas = [...this.userTareaStore.tareas()];
      this.mostrarTabla = this.tareasAgregadas.length > 0;
      this.presupuestoService.setTareasAgregadas(this.tareasAgregadas);
      this.updatePaginatedTareasPanel();
      if (this.clienteSeleccionado?.id) {
        this.userTareaService.cacheTareasByClienteId(this.clienteSeleccionado.id, this.tareasAgregadas);
      }
    });
  }

  ngOnInit(): void {
    this.initSession();
    this.loadRecentTasks();
    this.refreshPendingSyncSummary();
    this.restorePendingBudget();
    this.initUiState();
    if (this.trialMode) return;
    // Los stores reaccionan a IDB via liveQuery desde el primer momento.
    // HTTP corre en background y actualiza IDB; los effects sincronizan al componente.
    if (this.userCode) {
      this.empresaStore.init(this.userCode);
    }
  }

  // ── Sesión: leer userCode, detectar demo, fetchUserData o redirigir ──────
  private initSession(): void {
    this.trialMode = this.isTrialMode();
    if (this.trialMode) {
      this.loadDemoData();
      return;
    }
    this.loadUserCode();
    // reloadClientes ya no es necesario: ClienteStore reacciona a IDB via liveQuery
    localStorage.removeItem('reloadClientes');
  }

  // ── Presupuesto pendiente: leer antes de initEmpresas para que el ────────
  //    callback de clientes lo encuentre en this.presupuestoPendiente ────────
  private restorePendingBudget(): void {
    const stored = localStorage.getItem('presupuestoCargado');
    if (stored) {
      this.presupuestoPendiente = JSON.parse(stored) as SavedPresupuesto;
    }
  }

  // ── UI auxiliar: countdown, colorScheme, fecha de presupuesto ────────────
  private initUiState(): void {
    interval(1000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.userData?.fechaVencimiento) {
        this.calculateRemainingTime(this.userData.fechaVencimiento);
      }
    });
    if (!this.trialMode) {
      // Activo: cada 4s con ops pendientes. Idle: cada 5 ticks (20s)
      let idleTicks = 0;
      interval(4000).pipe(takeUntil(this.destroy$)).subscribe(() => {
        if (this.offlineSync.hasPendingOps() || this.offlineSync.isSyncing()) {
          idleTicks = 0;
          this.refreshPendingSyncSummary();
        } else if (++idleTicks >= 5) {
          idleTicks = 0;
          this.refreshPendingSyncSummary();
        }
      });
    }
    this.colorScheme = this.loadColorScheme();
    this.budgetDate = new Date().toISOString().split('T')[0];
  }

  async refreshPendingSyncSummary(): Promise<void> {
    this.pendingSyncSummary = await this.offlineSync.getPendingSummary();
  }





  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    cleanupBootstrapModals();
  }




  private isTrialMode(): boolean {
  return localStorage.getItem('trialMode') === 'true';
}


  private loadDemoData(): void {
  const demoUserData = localStorage.getItem('userData');
  this.userData = demoUserData ? JSON.parse(demoUserData) : { pais: 'Argentina', provincia: 'Buenos Aires' };
  this.userCode = 'demo';

  const demoEmpresasRaw = localStorage.getItem('demoEmpresas');
  this.empresas = demoEmpresasRaw ? JSON.parse(demoEmpresasRaw) : [];

  const demoEmpresaBase = {
    id: 1,
    name: 'Metro Constructora Demo',
    phone: '11-2233-4455',
    email: 'contacto@metrodemo.com',
    description: 'Líderes en construcción modular y refacciones premium. Tu proyecto, nuestra pasión.',
    logoUrl: 'assets/demo-logo/demo-logo.jpg',
    userCode: 'demo',
    website: 'www.metroconstructora.com.ar',
    tiktok: '@MetroDemoConstruye',
    instagram: '@metro_demo_ok',
    facebook: 'MetroConstructoraOficial',
    cuilCuit: '30-77889900-1'
  };

  if (this.empresas.length === 0) {
    this.empresas = [demoEmpresaBase];
  } else {
    // Parchar siempre la empresa demo con los campos de redes para evitar datos stale
    this.empresas = this.empresas.map(e =>
      e.id === 1 ? { ...demoEmpresaBase, ...e, tiktok: demoEmpresaBase.tiktok, instagram: demoEmpresaBase.instagram, facebook: demoEmpresaBase.facebook, website: demoEmpresaBase.website } : e
    );
  }
  localStorage.setItem('demoEmpresas', JSON.stringify(this.empresas));

  this.updatePaginatedEmpresas();
  this.selectedEmpresaId = this.empresas[0] || null;

  const demoTareas = localStorage.getItem('demoTareas');
  const tareas = demoTareas ? JSON.parse(demoTareas) : [];
  this.tareas = tareas;
  this.tareasFiltradas = this.tareas.map(t => ({ ...t, costo: 1234, totalCost: 1234 }));

  this.tareasAgregadas = [];
  this.mostrarTabla = false;
  this.remainingTime = 'Modo demo';

  if (this.selectedEmpresaId?.id) {
    localStorage.setItem('selectedEmpresaId', String(this.selectedEmpresaId.id));
    localStorage.setItem('selectedEmpresa', JSON.stringify(this.selectedEmpresaId));
    this.onEmpresaSeleccionada(this.selectedEmpresaId);
  }

}


  seleccionarCliente(cliente: Cliente): void {
    localStorage.removeItem('selectedPresupuestoName');
    this.presupuestoSeleccionado = null;
    if (this.trialMode) {
      this.clienteSeleccionado = cliente;
      this.syncSelectedClienteStorage();
      void this.loadTareasAgregadas();
      return;
    }
    this.clearVisibleTasks();
    this.clienteStore.select(cliente);
  }

  cargarDatosEmpresaSeleccionada() {
    if (this.selectedEmpresaId) {
      this.empresaName = this.selectedEmpresaId.name || '';
      this.empresaPhone = this.selectedEmpresaId.phone || '';
      this.empresaEmail = this.selectedEmpresaId.email || '';
      this.additionalDetailsEmpresa = this.selectedEmpresaId.description || '';
      this.empresaWebsite = this.selectedEmpresaId.website || '';
      this.empresaTikTok = this.selectedEmpresaId.tiktok || '';
      this.empresaInstagram = this.selectedEmpresaId.instagram || '';
      this.empresaFacebook = this.selectedEmpresaId.facebook || '';
      this.empresaCuilCuit = this.selectedEmpresaId.cuilCuit || '';
      this.presupuestoColorPrimario = this.selectedEmpresaId.primaryColor || '#0b69a6';
      this.presupuestoColorSecundario = this.selectedEmpresaId.secondaryColor || '#f0f4fa';
      this.presupuestoColorSecundario2 = this.selectedEmpresaId.secondaryColor2 || '#f0f4fa';
      this.presupuestoGradienteAngulo = this.selectedEmpresaId.gradientAngle || 'to bottom';
      this.presupuestoColorTexto = this.selectedEmpresaId.textColor || '#333333';
      this.presupuestoColorTabla = this.selectedEmpresaId.tableColor || '#343a40';
      this.presupuestoColorTablaTexto = this.selectedEmpresaId.tableTextColor || '#ffffff';
      this.presupuestoColorTablaCuerpo = this.selectedEmpresaId.tableBodyColor || '#ffffff';
      this.presupuestoInfoBoxColorHex = this.selectedEmpresaId.infoBoxColorHex || '#f8f9fa';
      this.presupuestoInfoBoxOpacity = this.selectedEmpresaId.infoBoxOpacity ?? 1;
      this.showSocialFields = this.hasSocialData();
      // Si hay logo, actualizar imagen
      this.actualizarImagenEmpresa(this.selectedEmpresaId);
    } else {
      this.empresaName = '';
      this.empresaPhone = '';
      this.empresaEmail = '';
      this.additionalDetailsEmpresa = '';
      this.empresaWebsite = '';
      this.empresaTikTok = '';
      this.empresaInstagram = '';
      this.empresaFacebook = '';
      this.empresaCuilCuit = '';
      this.presupuestoColorPrimario = '#0b69a6';
      this.presupuestoColorSecundario = '#f0f4fa';
      this.presupuestoColorSecundario2 = '#f0f4fa';
      this.presupuestoGradienteAngulo = 'to bottom';
      this.presupuestoColorTexto = '#333333';
      this.presupuestoColorTabla = '#343a40';
      this.presupuestoColorTablaTexto = '#ffffff';
      this.presupuestoColorTablaCuerpo = '#ffffff';
      this.presupuestoInfoBoxColorHex = '#f8f9fa';
      this.presupuestoInfoBoxOpacity = 1;
      this.showSocialFields = false;
      this.actualizarImagenEmpresa(null);
    }
  }

  reiniciarColores() {
    this.presupuestoColorPrimario = '#0b69a6';
    this.presupuestoColorSecundario = '#f0f4fa';
    this.presupuestoColorSecundario2 = '#f0f4fa';
    this.presupuestoGradienteAngulo = 'to bottom';
    this.presupuestoColorTexto = '#333333';
    this.presupuestoColorTabla = '#343a40';
    this.presupuestoColorTablaTexto = '#ffffff';
    this.presupuestoColorTablaCuerpo = '#ffffff';
    this.presupuestoInfoBoxColorHex = '#f8f9fa';
    this.presupuestoInfoBoxOpacity = 1;
    this.appToast.info('Colores reiniciados a valores por defecto');
  }


  getEmpresasByUserCode(): void {
    if (this.trialMode) {
      const demoEmpresasRaw = localStorage.getItem('demoEmpresas');
      this.empresas = demoEmpresasRaw ? JSON.parse(demoEmpresasRaw) : [];
      this.updatePaginatedEmpresas();
      return;
    }
    // Los stores reaccionan automáticamente via liveQuery.
    // Este método ahora solo dispara un refresh HTTP en background.
    this.empresaStore.refreshFromRemote();
  }


  openListaEmpresasModal(): void {
    this.getEmpresasByUserCode();
    // Cierra el modal de empresa usando la forma nativa de Bootstrap
    const empresaModalEl = document.getElementById('exampleModal');
    if (empresaModalEl && empresaModalEl.classList.contains('show')) {
      const empresaModalInstance = bootstrap.Modal.getInstance(empresaModalEl) || new bootstrap.Modal(empresaModalEl);
      empresaModalInstance.hide();
    }
    // Abre el modal de lista de empresas
    const listaEmpresasModalEl = document.getElementById('listaEmpresasModal');
    if (!listaEmpresasModalEl) {
      this.appToast.error('Error al abrir la lista de empresas');
      return;
    }
    const listaEmpresasModalInstance = bootstrap.Modal.getInstance(listaEmpresasModalEl) || new bootstrap.Modal(listaEmpresasModalEl);
    listaEmpresasModalInstance.show();
  }

  updatePaginatedEmpresas(): void {
    this.totalEmpresaPages = Math.ceil(this.empresas.length / this.itemsPerPageEmpresas) || 1;
    if (this.currentEmpresaPage > this.totalEmpresaPages) this.currentEmpresaPage = 1;
    const startIndex = (this.currentEmpresaPage - 1) * this.itemsPerPageEmpresas;
    this.paginatedEmpresas = this.empresas.slice(startIndex, startIndex + this.itemsPerPageEmpresas);
  }

  getEmpresaPages(): number[] {
    return Array(this.totalEmpresaPages).fill(0).map((_, i) => i + 1);
  }

  setEmpresaPage(page: number): void {
    if (page >= 1 && page <= this.totalEmpresaPages) {
      this.currentEmpresaPage = page;
      this.updatePaginatedEmpresas();
    }
  }

  previousEmpresaPage(): void {
    if (this.currentEmpresaPage > 1) {
      this.currentEmpresaPage--;
      this.updatePaginatedEmpresas();
    }
  }

  nextEmpresaPage(): void {
    if (this.currentEmpresaPage < this.totalEmpresaPages) {
      this.currentEmpresaPage++;
      this.updatePaginatedEmpresas();
    }
  }

  solicitarConfirmacionEliminarEmpresa(id: number): void {
    this.uiDialog.confirmDelete('empresa', '¿Deseas eliminar esta empresa? Esta acción no se puede deshacer.').then(confirmed => {
      if (!confirmed) return;
      this.empresaService.deleteEmpresa(id).subscribe({
        next: () => {
          this.removeEmpresaFromState(id);
          this.appToast.success(
            navigator.onLine
              ? 'Empresa eliminada correctamente'
              : 'Empresa eliminada localmente. Se sincronizara cuando vuelva la conexion.'
          );
        },
        error: (error) => {
          this.appToast.error(error.message || 'Error al eliminar la empresa');
          console.error('[EMPRESA] Error al eliminar empresa:', error);
        }
      });
    });
  }




  deleteCliente(id: number): void {

    this.clienteService.deleteCliente(id).subscribe({
      next: () => {
        this.removeClienteFromState(id);
        this.appToast.success(
          navigator.onLine
            ? 'Cliente eliminado correctamente'
            : 'Cliente eliminado localmente. Se sincronizara cuando vuelva la conexion.',
          'Exito'
        );
      },
      error: (error) => {
        console.error('Error al eliminar cliente:', error);
        this.appToast.error(error.message || 'Error al eliminar el cliente', 'Error');
      }
    });
  }

  solicitarConfirmacionEliminar(id: number): void {
if (this.trialMode) {
  const key = `demoCliente_${id}`;
  localStorage.removeItem(key);

  this.removeClienteFromState(id);
  this.appToast.success('Cliente eliminado en modo demo', 'Éxito');
  return;
}


    this.uiDialog.confirmDelete('cliente', '¿Deseas eliminar este cliente? Esta acción no se puede deshacer.').then(confirmed => {
      if (confirmed) this.deleteCliente(id);
    });
  }

  cancelarEliminarCliente(): void {
    this.mostrarModalConfirmacion = false;
    this.clienteAEliminar = null;
  }

  updatePaginatedClientes(): void {
    this.totalPages = Math.ceil(this.clientes.length / this.itemsPerPage) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = 1;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedClientes = this.clientes.slice(startIndex, startIndex + this.itemsPerPage);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedClientes();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedClientes();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedClientes();
    }
  }

  getPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  updatePaginatedTareasPanel(): void {
    this.tareasTotalPages = Math.ceil(this.tareasAgregadas.length / this.TAREAS_PANEL_PAGE_SIZE) || 1;
    if (this.tareasCurrentPage > this.tareasTotalPages) this.tareasCurrentPage = this.tareasTotalPages;
    const start = (this.tareasCurrentPage - 1) * this.TAREAS_PANEL_PAGE_SIZE;
    this.tareasAgregadasPaginadas = this.tareasAgregadas.slice(start, start + this.TAREAS_PANEL_PAGE_SIZE);
  }

  tareasNextPage(): void {
    if (this.tareasCurrentPage < this.tareasTotalPages) {
      this.tareasCurrentPage++;
      this.updatePaginatedTareasPanel();
    }
  }

  tareasPrevPage(): void {
    if (this.tareasCurrentPage > 1) {
      this.tareasCurrentPage--;
      this.updatePaginatedTareasPanel();
    }
  }




  initQR() {
    if (typeof QRCodeStyling !== 'undefined') {
      this.qrCode = new QRCodeStyling({
        width: 280,
        height: 280,
        type: "svg",
        data: "https://orbitasoftware.com.ar",
        image: "",
        dotsOptions: { color: "#111827", type: "dots" },
        backgroundOptions: { color: "#ffffff", gradient: null },
        cornersSquareOptions: { type: "dot" },
        cornersDotOptions: { type: "dot" },
        imageOptions: { crossOrigin: "anonymous", margin: 10, imageSize: 0.18 }
      });

      const modalEl = document.getElementById('qrModal');
      if (modalEl) {
        modalEl.addEventListener('show.bs.modal', () => {
          const qrContainer = document.getElementById('qrContainer');
          if (qrContainer && !qrContainer.hasChildNodes()) {
            this.qrCode.append(qrContainer);
          }
        });
      }
    }
  }

  abrirGeneradorQR() {
    const modalEl = document.getElementById('qrModal');
    if (modalEl) {
      setTimeout(() => {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }, 400); // Darle tiempo a Offcanvas para cerrar
    }
  }

  updateSizeLabel(e: any) {
    const val = e.target?.value || 280;
    const label = document.getElementById('qrSizeOut');
    if (label) label.innerText = val;
  }

  setQrLogoUrl() {
    const preview = document.getElementById('qrLogoPreview') as HTMLImageElement;
    if (this.qrLogoUrlValue && preview) {
      preview.src = this.qrLogoUrlValue;
      preview.classList.remove('d-none');
    }
  }

  onQrLogoFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const preview = document.getElementById('qrLogoPreview') as HTMLImageElement;
        if (preview) {
          preview.src = e.target.result;
          preview.classList.remove('d-none');
        }
      };
      reader.readAsDataURL(file);
    }
  }

  actualizarQR() {
    if (!this.qrCode) return;
    try {
      const dataStr = (document.getElementById('qrDataInput') as HTMLInputElement)?.value || '';
      const sizeStr = (document.getElementById('qrSizeRange') as HTMLInputElement)?.value || '280';
      const ecLevel = (document.getElementById('qrEcLevel') as HTMLSelectElement)?.value || 'M';
      const dotsType = (document.getElementById('qrDotsType') as HTMLSelectElement)?.value || 'dots';
      const dotsColor = (document.getElementById('qrDotsColor') as HTMLInputElement)?.value || '#111827';
      const cornersSquareType = (document.getElementById('qrCornersSquare') as HTMLSelectElement)?.value || 'dot';
      const cornersDotType = (document.getElementById('qrCornersDot') as HTMLSelectElement)?.value || 'dot';
      const selectedBgMode = (document.querySelector('input[name="qrBgMode"]:checked') as HTMLInputElement)?.value || 'solid';
      const bgColor1 = (document.getElementById('qrBgColor') as HTMLInputElement)?.value || '#ffffff';
      const bgColor2 = (document.getElementById('qrBgColor2') as HTMLInputElement)?.value || '#dbeafe';
      const bgDirection = (document.getElementById('qrBgGradientDirection') as HTMLSelectElement)?.value || 'to bottom';
      const logoSizePercent = parseInt((document.getElementById('qrLogoSize') as HTMLInputElement)?.value || '18', 10);
      const previewImg = document.getElementById('qrLogoPreview') as HTMLImageElement;

      let gradientObj: any = null;
      let finalBgColor = bgColor1;

      if (selectedBgMode === 'transparent') {
        finalBgColor = 'transparent';
      } else if (selectedBgMode === 'gradient') {
        finalBgColor = '';
        let offset1 = 0; let offset2 = 1;
        gradientObj = {
          type: 'linear', rotation: bgDirection === 'to bottom' ? 1.5708 : bgDirection === 'to right' ? 0 : 0, // Simplified rotation
          colorStops: [{ offset: offset1, color: bgColor1 }, { offset: offset2, color: bgColor2 }]
        };
      }

      const parsedSize = parseInt(sizeStr, 10);
      let logoUrl = '';
      if (previewImg && !previewImg.classList.contains('d-none') && previewImg.src) {
        logoUrl = previewImg.src;
      }
      const finalLogoSize = logoSizePercent / 100;

      this.qrCode.update({
        width: parsedSize,
        height: parsedSize,
        data: dataStr || 'https://orbitasoftware.com.ar',
        image: logoUrl,
        dotsOptions: { color: dotsColor, type: dotsType as any },
        backgroundOptions: { color: finalBgColor, gradient: gradientObj },
        cornersSquareOptions: { type: cornersSquareType as any },
        cornersDotOptions: { type: cornersDotType as any },
        qrOptions: { errorCorrectionLevel: ecLevel as any },
        imageOptions: { crossOrigin: "anonymous", margin: Math.round(parsedSize * 0.02), imageSize: finalLogoSize }
      });

      const wrap = document.getElementById('qrPreviewWrap');
      if (wrap) {
        if (selectedBgMode === 'transparent') {
          wrap.style.background = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAOklEQVQYV2NkYGAwZmBgOMuAACA+EGxgINSAK8IiM2EaQDRMzEQIY/FchG4csknkGkR2A00TMI0EawAAet0X+flpIfkAAAAASUVORK5CYII=") repeat';
        } else {
          wrap.style.background = 'none';
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  descargarQRPng() {
    if (this.qrCode) this.qrCode.download({ name: 'qr-generado', extension: 'png' });
  }

  descargarQRSvg() {
    if (this.qrCode) this.qrCode.download({ name: 'qr-generado', extension: 'svg' });
  }

ngAfterViewInit() {
  const menuBtn = document.getElementById('menuToggleBtn');
  const offcanvasElement = document.getElementById('offcanvasMenu');
  if (menuBtn && offcanvasElement) {
    offcanvasElement.addEventListener('shown.bs.offcanvas', () => {
      menuBtn.style.display = 'none';
    });
    offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
      menuBtn.style.display = 'flex';
    });
  }




  // Limpiar modal-backdrop y restaurar foco para modales
  const modals = ['exampleModal', 'listaEmpresasModal', 'imageModal', 'clientModal', 'listaClientesModal', 'miModal', 'provinciaModal', 'qrModal', 'recentTasksModal', 'buscadorInfoModal', 'ajustesListaModal', 'faqModalAjustes'];
  modals.forEach(modalId => {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      modalElement.addEventListener('show.bs.modal', () => {
        // Limpiar backdrops existentes antes de mostrar uno nuevo si ya hay alguno
        const backdrops = document.querySelectorAll('.modal-backdrop');
        if (backdrops.length > 0) {
          backdrops.forEach(b => b.remove());
          document.body.classList.remove('modal-open');
        }
      });

      modalElement.addEventListener('hidden.bs.modal', () => {
        // Al ocultar, si no hay más modales visibles, limpiar todo
        setTimeout(() => {
          const visibleModals = document.querySelectorAll('.modal.show');
          if (visibleModals.length === 0) {
            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
            document.body.classList.remove('modal-open');
            document.body.style.paddingRight = '';
            document.body.style.overflow = '';
          }
        }, 100);
      });
    }
  });

  // Lógica para reabrir listaClientesModal al cerrar clientModal
  const clientModal = document.getElementById('clientModal');
  const listaClientesModal = document.getElementById('listaClientesModal');
  if (clientModal && listaClientesModal) {
    clientModal.addEventListener('hidden.bs.modal', () => {
      // Limpiar todos los backdrops al cerrar clientModal
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());

      // Reabrir listaClientesModal si estaba abierto antes
      setTimeout(() => {
        const listaClientesInstance = new bootstrap.Modal(listaClientesModal);
        listaClientesInstance.show();
      }, 300); // Delay para permitir que el DOM se actualice
    });
  }

  // Lógica para reabrir el modal de empresa al cerrar el de imagen
  const imageModal = document.getElementById('imageModal');
  if (imageModal) {
    imageModal.addEventListener('hidden.bs.modal', () => {
      const empresaModal = document.getElementById('exampleModal');
      if (this.reabrirEmpresaModal && empresaModal && !empresaModal.classList.contains('show')) {
        setTimeout(() => {
          const modal = new bootstrap.Modal(empresaModal);
          modal.show();
          this.reabrirEmpresaModal = false;
        }, 300);
      } else {
        this.reabrirEmpresaModal = false;
      }
      // Limpiar backdrops
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
    });
  }

  // Lógica para reabrir el modal de empresa al cerrar el de listaEmpresasModal
  const listaEmpresasModal = document.getElementById('listaEmpresasModal');
  if (listaEmpresasModal) {
    listaEmpresasModal.addEventListener('hidden.bs.modal', () => {
      const empresaModal = document.getElementById('exampleModal');
      if (empresaModal && !empresaModal.classList.contains('show')) {
        setTimeout(() => {
          const modal = new bootstrap.Modal(empresaModal);
          modal.show();
        }, 300);
      }
      // Limpiar backdrops
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
    });
  }

  this.initQR();
}



// src/app/componentes/dashboard/dashboard.component.ts shareReplay
obtenerTareas(): void {
  if (this.userData?.pais) {
    this.tareaService.getTareasByPaisCached(this.userData.pais).pipe(takeUntil(this.destroy$)).subscribe({
      next: (tareas) => {
        this.tareas = tareas;
        this.tareasFiltradas = tareas;
      },
      error: () => {
        if (this.tareas.length === 0) {
          this.appToast.error('No se pudieron cargar las tareas. Revisá tu conexión e intentá de nuevo.', 'Error de carga');
        } else {
          this.appToast.warning('No se pudo actualizar el catálogo de tareas. Estás viendo datos guardados anteriormente.', 'Sin conexión');
        }
      }
    });
  }
}










async loadTareasAgregadas(): Promise<void> {
    // Cargar desde localStorage como respaldo inicial

  /*if (this.trialMode) {
    const storedTareas = localStorage.getItem('tareasAgregadas');
    this.tareasAgregadas = storedTareas ? JSON.parse(storedTareas) : [];
    this.mostrarTabla = this.tareasAgregadas.length > 0;
    return;
  }*/

if (this.trialMode) {
  const key = this.demoTareasKey(this.clienteSeleccionado?.id ?? null);
  const stored = localStorage.getItem(key);
  this.tareasAgregadas = stored ? JSON.parse(stored) : [];
  this.mostrarTabla = this.tareasAgregadas.length > 0;
  return;
}

    const storedTasks = await this.getStoredAuthTasksLocal(this.clienteSeleccionado?.id ?? null);
    if (storedTasks.length > 0) {
      this.tareasAgregadas = storedTasks;
      this.mostrarTabla = this.tareasAgregadas.length > 0;
    }

    if (!navigator.onLine && storedTasks.length > 0) {
      return;
    }

    // Sincronizar con el backend
    const clienteId = this.clienteSeleccionado?.id;
    if (clienteId != null) {
      this.userTareaService.getTareasByClienteId(clienteId).pipe(takeUntil(this.destroy$)).subscribe({
        next: (tareas) => {
          this.tareasAgregadas = tareas;
          this.actualizarTablaYStorage();
          this.userTareaService.cacheTareasByClienteId(clienteId, this.tareasAgregadas);
        },
        error: () => {
          this.appToast.error('Error al cargar las tareas agregadas del backend', 'Error');
        }
      });
    }
  }




  seleccionar(tarea: Tarea): void {
  if (!this.selectedEmpresaId) {
    this.uiDialog.warning({ title: 'Falta selección de empresa', text: 'Debe seleccionar una empresa primero.' });
    return;
  }

  if (!this.clientes || this.clientes.length === 0) {
    this.uiDialog.info({ title: 'Sin clientes', text: 'La empresa seleccionada no tiene clientes registrados. Por favor, agregue clientes primero.' });
    return;
  }

  if (!this.clienteSeleccionado) {
    this.uiDialog.warning({ title: 'Falta selección', text: 'Debe seleccionar un cliente.' });
    return;
  }

  this.tareaSeleccionada = {
    ...tarea,
    descripcion: '',
    totalCost: this.calcularTotalCosto(tarea)
  };
  this.abrirModal();
}





    abrirModal(): void {
      const modal = new bootstrap.Modal(document.getElementById('miModal') as HTMLElement);
      modal.show();
    }






actualizarTarea(): void {
    if (this.tareaSeleccionada?.id) {
      const updatedTarea: UserTarea = {
        ...this.tareaSeleccionada,
  clienteId: this.clienteSeleccionado?.id ?? 0, // Usa clienteId seguro
        pais: this.userData.pais,
        rubro: this.tareaSeleccionada.rubro || '',
        categoria: this.tareaSeleccionada.categoria || '',
        totalCost: this.calcularTotalCosto(this.tareaSeleccionada)
      };
      this.userTareaService.updateUserTarea(this.tareaSeleccionada.id, updatedTarea).subscribe({
        next: (tareaActualizada) => {
          this.appToast.success('Tarea actualizada', 'Éxito');
          const index = this.tareasAgregadas.findIndex(t => t.id === this.tareaSeleccionada.id);
          if (index !== -1) {
            this.tareasAgregadas[index] = tareaActualizada;
          }
          this.actualizarTablaYStorage();
          this.resetTareaSeleccionada();
        },
        error: () => {
          const index = this.tareasAgregadas.findIndex(t => t.id === this.tareaSeleccionada.id);
          if (index !== -1) {
            this.tareasAgregadas[index] = updatedTarea;
            this.actualizarTablaYStorage();
            this.appToast.error('Error al actualizar la tarea en el backend, actualizada localmente', 'Error');
          }
          this.resetTareaSeleccionada();
        }
      });
    }
  }





agregarTarea(): void {

/*if (this.trialMode && this.tareasAgregadas.length >= 7) {
  this.appToast.info('En modo demo solo podés agregar 7 tareas', 'Modo demo');
  return;
}*/

if (this.trialMode) {
  const clienteId = this.clienteSeleccionado?.id ?? null;

  if (this.tareasAgregadas.length >= 7) {
    this.appToast.info('En modo demo solo podés agregar 7 tareas', 'Modo demo');
    return;
  }

  const nuevaTarea: UserTarea = {
    ...this.tareaSeleccionada,
    id: this.tareaSeleccionada.id || Date.now(),
    clienteId: clienteId ?? 0,
    pais: this.userData?.pais || 'Argentina',
    rubro: this.tareaSeleccionada.rubro || '',
    categoria: this.tareaSeleccionada.categoria || '',
    totalCost: this.calcularTotalCosto(this.tareaSeleccionada)
  };

  this.tareasAgregadas.push(nuevaTarea);
  this.mostrarTabla = true;

  localStorage.setItem(this.demoTareasKey(clienteId), JSON.stringify(this.tareasAgregadas));
  localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));

  this.presupuestoService.setTareasAgregadas(this.tareasAgregadas);
  this.updatePaginatedTareasPanel();
  this.appToast.success('Tarea agregada en modo demo');
  this.saveToRecent(nuevaTarea); // Save even in demo
  this.resetTareaSeleccionada();
  return;
}



    if (!this.selectedEmpresaId) {
      this.appToast.warning('Primero seleccioná una empresa', 'Sin empresa');
      return;
    }

    if (!this.clienteSeleccionado) {
      this.appToast.warning('Primero seleccioná un cliente', 'Sin cliente');
      return;
    }

    const clienteId = this.clienteSeleccionado.id;

    const nuevaTarea: UserTarea = {
      ...this.tareaSeleccionada,
      id: this.tareaSeleccionada.id || Date.now(),
      clienteId: clienteId ?? 0,
      pais: this.userData.pais,
      rubro: this.tareaSeleccionada.rubro || '',
      categoria: this.tareaSeleccionada.categoria || '',
      totalCost: this.calcularTotalCosto(this.tareaSeleccionada)
    };

    const guardarLocal = (mensaje?: string) => {
      if (!this.tareasAgregadas.some(t => t.id === nuevaTarea.id)) {
        this.tareasAgregadas.push(nuevaTarea);
      }
      this.mostrarTabla = true;
      localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
      localStorage.setItem(this.authTareasKey(clienteId), JSON.stringify(this.tareasAgregadas));
      this.presupuestoService.setTareasAgregadas(this.tareasAgregadas);
      this.saveToRecent(nuevaTarea); // Save to recent tasks
      if (mensaje) {
        this.appToast.info(mensaje, 'Informacion');
      }
      this.resetTareaSeleccionada();
    };

    if (!clienteId) {
      guardarLocal('Tarea agregada localmente. Podras asociarla a un cliente mas adelante.');
      return;
    }

    this.userTareaService.addUserTarea(nuevaTarea).subscribe({
      next: (tarea) => {
        // liveQuery effect updates tareasAgregadas; just update secondary state
        this.mostrarTabla = true;
        this.saveToRecent(tarea);
        this.appToast.success('Tarea agregada');
        this.resetTareaSeleccionada();
      },
      error: (error) => {
        console.error('Error al agregar tarea:', error.message, nuevaTarea);
        guardarLocal(error.message || 'Error al sincronizar con el backend, tarea guardada localmente');
      }
    });
  }

  async verPresupuesto(): Promise<void> {
  // Permitir vista previa incluso sin empresa o cliente seleccionados.
    localStorage.removeItem('selectedPresupuestoName');
  if (this.clienteSeleccionado) {
    localStorage.setItem('selectedCliente', JSON.stringify(this.clienteSeleccionado));
  } else {
    localStorage.removeItem('selectedCliente');
  }

  if (this.selectedEmpresaId) {
    localStorage.setItem('selectedEmpresa', JSON.stringify(this.selectedEmpresaId));
  } else {
    localStorage.removeItem('selectedEmpresa');
  }

  localStorage.setItem('selectedTareas', JSON.stringify(this.tareasAgregadas ?? []));
  await this.localStore.setState('budget:active-preview', {
    presupuesto: this.presupuestoSeleccionado,
    empresa: this.selectedEmpresaId ?? null,
    cliente: this.clienteSeleccionado ?? null,
    tareas: this.tareasAgregadas ?? [],
    name: this.presupuestoSeleccionado?.name || '',
    budgetDate: this.budgetDate || new Date().toISOString()
  });
  this.route.navigate(['/presupuesto']);



}






async cargarPresupuestoDesdeLista(presupuesto: SavedPresupuesto): Promise<void> {
  console.debug('[dashboard] cargarPresupuestoDesdeLista', presupuesto.id, presupuesto.name);
  await this.aplicarPresupuestoGuardado(presupuesto, { scrollToTable: true });
}

private async aplicarPresupuestoGuardado(
  presupuesto: SavedPresupuesto,
  options: { scrollToTable?: boolean } = {}
): Promise<void> {
   const { scrollToTable = true } = options;
   this.presupuestoPendiente = null;
   this.presupuestoSeleccionado = presupuesto;
   localStorage.setItem('presupuestoCargado', JSON.stringify(presupuesto));
   localStorage.setItem('selectedPresupuestoName', presupuesto.name);
   await this.localStore.setState('budget:active-preview', {
     presupuesto,
     empresa: presupuesto.empresa || this.selectedEmpresaId || null,
     cliente: presupuesto.cliente || null,
     tareas: presupuesto.tareas || [],
     name: presupuesto.name,
     budgetDate: presupuesto.createdAt || new Date().toISOString()
   });


  // 1. CARGAR TAREAS DEL PRESUPUESTO
  this.tareasAgregadas = (presupuesto.tareas || []).map(tarea => ({
    ...tarea,
    // Aseguramos que totalCost sea número (por si viene como string)
    totalCost: Number(tarea.totalCost) || 0
  }));

  this.mostrarTabla = this.tareasAgregadas.length > 0;

  // Guardar en localStorage y servicio global
  localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
  this.presupuestoService.setTareasAgregadas(this.tareasAgregadas);
  this.tareasCurrentPage = 1;
  this.updatePaginatedTareasPanel();

  // 2. CARGAR CLIENTE DEL PRESUPUESTO
  if (presupuesto.cliente && presupuesto.cliente.id) {
    // Buscar si el cliente ya está en la lista cargada
    const clienteEncontrado = this.clientes.find(c => c.id === presupuesto.cliente.id);

    if (clienteEncontrado) {
      this.clienteSeleccionado = clienteEncontrado;
    } else {
      // Si no está en la lista local, usar el que viene del backend
      this.clienteSeleccionado = presupuesto.cliente;
    }

    // Guardar en localStorage
    this.syncSelectedClienteStorage();
  } else {
    this.clienteSeleccionado = null;
    this.syncSelectedClienteStorage();
    console.warn('El presupuesto no tiene cliente asociado');
  }

  this.budgetDate = new Date().toISOString().split('T')[0];

  // 3. NO TOCAR LA EMPRESA
  // La empresa actual ya está seleccionada por el usuario.
  // No la cambiamos al cargar un presupuesto (sería confuso para el usuario).

  // 5. SCROLL SUAVE A LA TABLA (opcional, mejora UX)
  if (scrollToTable) {
  setTimeout(() => {
    const tabla = document.querySelector('.table-responsive');
    if (tabla) {
      tabla.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
  }
}




toggleSavedBudgetsPanel(): void {
  if (this.trialMode) {
    this.uiDialog.info({ title: 'Modo demo', text: 'Esta función no está habilitada en el modo de prueba.' });
    return;
  }

  const nextState = !this.showSavedBudgetsPanel;
  this.showSavedBudgetsPanel = nextState;
  if (nextState) {
    this.showTareasPanel = false;
  }
}



toggleTareasPanel(): void {
  if (!this.trialMode) {
    const storeTareas = this.userTareaStore.tareas();
    const currentId = this.clienteSeleccionado?.id;
    if (storeTareas.length > 0 && this.tareasAgregadas.length === 0 &&
        currentId && storeTareas.every(t => t.clienteId === currentId)) {
      this.tareasAgregadas = [...storeTareas];
      this.mostrarTabla = true;
      this.presupuestoService.setTareasAgregadas(this.tareasAgregadas);
    }
  }

  if (!this.tareasAgregadas || this.tareasAgregadas.length === 0) {
    this.uiDialog.info({ title: 'Sin tareas', text: 'Aún no agregaste tareas. Agrega al menos una para poder ver el panel.' });
    return;
  }

  if (!this.showTareasPanel) {
    this.tareasCurrentPage = 1;
    this.updatePaginatedTareasPanel();
  }
  this.showTareasPanel = !this.showTareasPanel;
}

onPresupuestoEliminado(p: SavedPresupuesto) {
  // si es el que está cargado, limpiar
  if (this.presupuestoSeleccionado?.id === p.id) {
    this.limpiarPresupuestoCargado();
  }
}



limpiarPresupuestoCargado() {
  if (this.trialMode) {
  this.uiDialog.info({ title: 'Modo demo', text: 'Esta función no está habilitada en el modo de prueba.' });
  return;
}

  // Quitar info del presupuesto cargado
  this.presupuestoSeleccionado = null;
  this.budgetDate = '';
  localStorage.removeItem('presupuestoCargado');
  localStorage.removeItem('selectedPresupuestoName');
  this.localStore.removeState('budget:active-preview');


  // Volver a cargar tareas normales del cliente seleccionado
  if (this.clienteSeleccionado?.id) {
    const tareasLocales = this.getStoredAuthTasks(this.clienteSeleccionado.id);
    if (tareasLocales.length > 0) {
      this.applyCurrentTasks(tareasLocales);
      if (!navigator.onLine) {
        localStorage.removeItem('selectedTareas');
        return;
      }
    }

    this.userTareaService.getTareasByClienteId(this.clienteSeleccionado.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (tareas) => {
        this.applyCurrentTasks(tareas || []);
      },
      error: () => {
        if (tareasLocales.length === 0) {
          this.applyCurrentTasks([]);
        }
      }
    });
  } else {
    // Si no hay cliente seleccionado, limpiar todo
    this.applyCurrentTasks([]);
  }

  localStorage.removeItem('selectedTareas');
}




onPresupuestoActualizado(p: SavedPresupuesto) {
  console.debug('[dashboard] onPresupuestoActualizado', p.id, p.name);
  // actualizar estado y localStorage
  this.presupuestoSeleccionado = p;
  localStorage.setItem('presupuestoCargado', JSON.stringify(p));
  localStorage.setItem('selectedPresupuestoName', p.name);

  // refrescar tareas y UI usando tu método existente
  void this.aplicarPresupuestoGuardado(p, { scrollToTable: false });
}

closeSavedBudgetsPanel(): void {
  this.showSavedBudgetsPanel = false;
}

openColorSchemeModal(): void {
  const empresaModalEl = document.getElementById('exampleModal');
  if (empresaModalEl && empresaModalEl.classList.contains('show')) {
    const empresaModalInstance = bootstrap.Modal.getInstance(empresaModalEl) || new bootstrap.Modal(empresaModalEl);
    empresaModalInstance.hide();
  }
  const colorSchemeModalEl = document.getElementById('colorSchemeModal');
  if (colorSchemeModalEl) {
    const colorSchemeModalInstance = bootstrap.Modal.getInstance(colorSchemeModalEl) || new bootstrap.Modal(colorSchemeModalEl);
    colorSchemeModalInstance.show();
  }
}

saveColorScheme(): void {
  try {
    localStorage.setItem(this.colorSchemeStorageKey, JSON.stringify(this.colorScheme));
    this.colorSchemeMessageVisible = true;
    setTimeout(() => {
      this.colorSchemeMessageVisible = false;
    }, 2000);
  } catch (error) {
    console.error('No se pudo guardar el esquema de colores.', error);
  }
}

private loadColorScheme(): ColorScheme {
  try {
    const storedScheme = localStorage.getItem(this.colorSchemeStorageKey);
    if (storedScheme) {
      const parsedScheme = JSON.parse(storedScheme);
      return { ...this.defaultColorScheme, ...parsedScheme };
    }
  } catch (error) {
    console.error('No se pudo cargar el esquema de colores.', error);
  }
  return { ...this.defaultColorScheme };
}

      buscar(event: Event): void {
    const filtro = (event.target as HTMLInputElement).value.toLowerCase();
    this.tareasFiltradas = this.tareas.filter(tarea =>
      tarea.tarea.toLowerCase().includes(filtro) ||
      tarea.descripcion.toLowerCase().includes(filtro) ||
      tarea.rubro.toLowerCase().includes(filtro) ||
      tarea.categoria.toLowerCase().includes(filtro) ||
      tarea.costo.toString().includes(filtro) ||
      tarea.area.toString().includes(filtro) ||
      tarea.descuento.toString().includes(filtro)
    );
  }



abrirModalClientes(): void {
  if (!this.selectedEmpresaId) {
    this.appToast.warning('Primero creá o seleccioná una empresa', 'Sin empresa');
    return;
  }
  const el = document.getElementById('listaClientesModal');
  if (el) {
    const instance = bootstrap.Modal.getOrCreateInstance(el);
    instance.show();
  }
}

openClientModal(): void {
  if (this.trialMode) {
    const demoClientes = Object.keys(localStorage)
      .filter(key => key.startsWith('demoCliente_'))
      .map(key => JSON.parse(localStorage.getItem(key) || '{}'))
      .filter(c => c && c.empresaId === this.selectedEmpresaId?.id);

    if (demoClientes.length >= 2) {
      this.appToast.info('En modo demo solo podés crear 1 cliente', 'Modo demo');
      return;
    }
  }

  const listaModalEl = document.getElementById('listaClientesModal');
  if (listaModalEl) {
    const listaModal = bootstrap.Modal.getInstance(listaModalEl);
    listaModal?.hide();
  }

  setTimeout(() => {
    const modalElement = document.getElementById('clientModal');
    if (!modalElement) {
      return;
    }
    const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modalInstance.show();
  }, 200);
}





solicitarConfirmacionEliminarTarea(tarea: UserTarea): void {
  if (!tarea?.id) {
    return;
  }

  const descripcion = tarea.tarea || tarea.descripcion || 'esta tarea';

  this.uiDialog.confirmDelete(descripcion).then(confirmed => {
    if (confirmed) this.eliminarTarea(tarea.id);
  });
}


confirmarEliminarTarea(): void {
  if (this.tareaAEliminar == null) {
    return;
  }
  const id = this.tareaAEliminar;
  this.tareaAEliminar = null;
  this.tareaDescripcionAEliminar = null;
  this.eliminarTarea(id);
  const modalElement = document.getElementById('confirmDeleteTareaModal');
  if (modalElement) {
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
      modalInstance.hide();
    }
  }
}

limpiarConfirmacionEliminarTarea(): void {
  this.tareaAEliminar = null;
  this.tareaDescripcionAEliminar = null;
}

eliminarTarea(id: number): void {

  if (this.trialMode) {
  this.tareasAgregadas = this.tareasAgregadas.filter(t => t.id !== id);
  const key = this.demoTareasKey(this.clienteSeleccionado?.id ?? null);
  localStorage.setItem(key, JSON.stringify(this.tareasAgregadas));
  localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
  this.mostrarTabla = this.tareasAgregadas.length > 0;

  if (this.tareasAgregadas.length === 0) {
  this.showTareasPanel = false;
}

  this.appToast.success('Tarea eliminada en modo demo');
  return;
}

  this.userTareaService.deleteUserTarea(id).subscribe({
    next: () => {
      // Éxito: tarea eliminada del backend
      this.tareasAgregadas = this.tareasAgregadas.filter(t => t.id !== id);
      this.actualizarTablaYStorage();
      this.appToast.success('Tarea eliminada correctamente');
    },
    error: (err) => {
      console.error('Error completo al eliminar tarea:', err); // Para debug

      // 🔥 Extraer el mensaje del backend de forma robusta
      let mensajeBackend = 'Error al eliminar la tarea del servidor';

      // Caso 1: Backend devuelve { error: "mensaje" }
      if (err.error && typeof err.error === 'object' && err.error.error) {
        mensajeBackend = err.error.error;
      }
      // Caso 2: Backend devuelve { message: "mensaje" }
      else if (err.error && typeof err.error === 'object' && err.error.message) {
        mensajeBackend = err.error.message;
      }
      // Caso 3: Backend devuelve string plano
      else if (typeof err.error === 'string') {
        mensajeBackend = err.error;
      }
      // Caso 4: Fallback del statusText o message
      else if (err.message) {
        mensajeBackend = err.message;
      }

      // 🔥 Ahora sí: detectar si la tarea está asociada a presupuestos
      if (
        mensajeBackend.toLowerCase().includes('presupuesto') ||
        mensajeBackend.toLowerCase().includes('asociada') ||
        mensajeBackend.toLowerCase().includes('referenced') ||
        mensajeBackend.toLowerCase().includes('usada')
      ) {
        this.appToast.warning(
          'No se puede eliminar esta tarea porque está incluida en uno o más presupuestos guardados.\n' +
          'Si deseas borrarla permanentemente, elimina primero los presupuestos que la contienen.',
          'Tarea en uso',
          { timeOut: 10000, closeButton: true, enableHtml: true }
        );
      } else {
        // Cualquier otro error
        this.appToast.error(mensajeBackend, 'Error');
      }

      // Opcional: mantener consistencia visual aunque no se elimine del backend
      // this.tareasAgregadas = this.tareasAgregadas.filter(t => t.id !== id);
      this.actualizarTablaYStorage();
    }
  });
}



private actualizarTablaYStorage() {
  this.mostrarTabla = this.tareasAgregadas.length > 0;
  this.updatePaginatedTareasPanel();
  localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
  localStorage.setItem(this.authTareasKey(this.clienteSeleccionado?.id ?? null), JSON.stringify(this.tareasAgregadas));
  this.presupuestoService.setTareasAgregadas(this.tareasAgregadas);
  // persistCurrentTasksLocal() removido: los servicios ya escriben en IDB
  // al mutar; llamarlo aquí causaría loop liveQuery → effect → IDB → liveQuery

  if (!this.trialMode) {
    if (this.clienteSeleccionado?.id) {
      this.userTareaService.cacheTareasByClienteId(this.clienteSeleccionado.id, this.tareasAgregadas);
    }
    if (this.userCode) {
      this.userTareaService.cacheTareasByUserCode(this.userCode, this.tareasAgregadas);
    }
  }

  if (this.tareasAgregadas.length === 0) {
    this.showTareasPanel = false;
  }
}








      calcularTotalCosto(tarea: Tarea | UserTarea): number {
  return (tarea.area || 0) * (tarea.costo || 0) * (1 - (tarea.descuento || 0) / 100);
}

calcularCostoTotal(): number {
  return this.tareasAgregadas.reduce((total, tarea) => total + (tarea.totalCost || 0), 0);
}





  resetTareaSeleccionada(): void {
  this.tareaSeleccionada = {
    tarea: '',
    costo: 0,
    rubro: '',
    categoria: '',
    pais: this.userData?.pais || '',
    descripcion: '',
    descuento: 0,
    area: 1,
    totalCost: 0,
    userCode: this.userCode
  };
}




  logout(): void {
    this.uiDialog.confirmLogout().then(confirmed => {
      if (confirmed) {
        cleanupBootstrapModals();
        this.authService.logout();
        this.route.navigate(['']);
        this.appToast.success('Sesión cerrada correctamente');
      }
    });
  }




  abrirGoogleSheets2() {
    const url = "https://drive.google.com/file/d/1dZcSD_5lt3OsDE44SN91t5NcUyvQtl-N/view?usp=sharing";
    window.open(url, "_blank");
  }

  loadFormData() {
    const empresaData = JSON.parse(localStorage.getItem('empresaData') || '{}');
    this.empresaName = empresaData.empresaName || '';
    this.empresaPhone = empresaData.empresaPhone || '';
    this.empresaEmail = empresaData.empresaEmail || '';
    this.additionalDetailsEmpresa = empresaData.additionalDetailsempresa || '';
    this.empresaWebsite = empresaData.empresaWebsite || '';
    this.empresaTikTok = empresaData.empresaTikTok || '';
    this.empresaInstagram = empresaData.empresaInstagram || '';
    this.empresaFacebook = empresaData.empresaFacebook || '';
    this.empresaCuilCuit = empresaData.empresaCuilCuit || '';
    const uploadedImage = localStorage.getItem('uploadedImage');
    if (uploadedImage) {
      const mainPreview = document.getElementById('fixedImageIcon') as HTMLImageElement;
      const mainPreview2 = document.getElementById('fixedImageIconmodal') as HTMLImageElement;
      mainPreview.src = uploadedImage;
      mainPreview.style.display = 'block';
      mainPreview2.src = uploadedImage;
      mainPreview2.style.display = 'block';
    }
  }

  loadImageFromLocalStorage() {
    const uploadedImage = localStorage.getItem('uploadedImage');
    if (uploadedImage) {
      const modalPreview = this.modalImagePreview.nativeElement as HTMLImageElement;
      modalPreview.src = uploadedImage;
      modalPreview.style.display = 'block';
      const mainPreview = document.getElementById('fixedImageIcon') as HTMLImageElement;
      const mainPreview2 = document.getElementById('fixedImageIconmodal') as HTMLImageElement;
      mainPreview.src = uploadedImage;
      mainPreview.style.display = 'block';
      mainPreview2.src = uploadedImage;
      mainPreview2.style.display = 'block';
    }
  }









 uploadImage(): void {

  if (this.trialMode) {
  const fileInput = this.imageInput?.nativeElement as HTMLInputElement;
  const file = fileInput?.files?.[0];
  if (!file) {
    this.appToast.error('Selecciona una imagen primero.');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result || '');
    localStorage.setItem('demoEmpresaLogo', dataUrl);
    this.logoUrl = dataUrl;

    if (this.modalImagePreview) {
      this.modalImagePreview.nativeElement.src = dataUrl;
      this.modalImagePreview.nativeElement.style.display = 'block';
    }
    const mainPreview = document.getElementById('fixedImageIcon') as HTMLImageElement;
    if (mainPreview) {
      mainPreview.src = dataUrl;
      mainPreview.style.display = 'block';
    }
    this.appToast.success('Imagen guardada en modo demo');
  };
  reader.readAsDataURL(file);
  return;
}


    const fileInput = this.imageInput?.nativeElement as HTMLInputElement;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      this.appToast.error('Por favor, selecciona una imagen.');
      return;
    }

    const file = fileInput.files[0];
    this.empresaService.uploadImage(file, this.userCode, this.selectedEmpresaId?.id).subscribe({
      next: (url) => {
        localStorage.setItem('uploadedImage', url);
        this.applyImageUrl(url);
        this.appToast.success(
          navigator.onLine
            ? 'Imagen subida con exito.'
            : 'Imagen guardada localmente. Se subira cuando vuelva la conexion.'
        );
      },
      error: (err) => {
        this.appToast.error(`Error al subir la imagen: ${err.message}`);
      }
    });
  }



onImageChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.imageSelected = !!(target.files && target.files[0]);
  }





  saveFormData(): void {

 if (this.trialMode) {
  const demoEmpresasRaw = localStorage.getItem('demoEmpresas');
  const demoEmpresas = demoEmpresasRaw ? JSON.parse(demoEmpresasRaw) : [];

  /*const soloDefault =
  demoEmpresas.length === 1 && demoEmpresas[0].id === 1234;

if (demoEmpresas.length >= 1 && !soloDefault) {
  this.appToast.info('En modo demo solo podés tener 1 empresa', 'Modo demo');
  return;
}*/

  // Si ya existe una empresa demo, bloquear nuevas
  if (demoEmpresas.length >= 2) {
    this.appToast.info('En modo demo solo podés crear 1 empresa', 'Modo demo');
    return;
  }

  const localLogo = localStorage.getItem('demoEmpresaLogo') || this.logoUrl || '';

  const nuevaEmpresa: Empresa = {
    id: Date.now(),
    name: this.empresaName,
    phone: this.empresaPhone,
    email: this.empresaEmail,
    description: this.additionalDetailsEmpresa,
    logoUrl: localLogo,
    userCode: this.userCode,
    website: this.empresaWebsite,
    tiktok: this.empresaTikTok,
    instagram: this.empresaInstagram,
    facebook: this.empresaFacebook,
    cuilCuit: this.empresaCuilCuit,
    primaryColor: this.presupuestoColorPrimario,
    secondaryColor: this.presupuestoColorSecundario,
    secondaryColor2: this.presupuestoColorSecundario2,
    gradientAngle: this.presupuestoGradienteAngulo,
    textColor: this.presupuestoColorTexto,
    tableColor: this.presupuestoColorTabla,
    tableTextColor: this.presupuestoColorTablaTexto,
    tableBodyColor: this.presupuestoColorTablaCuerpo,
    infoBoxColorHex: this.presupuestoInfoBoxColorHex,
    infoBoxOpacity: this.presupuestoInfoBoxOpacity
  };

/*if (soloDefault) {
  demoEmpresas.length = 0; // elimina la demo por defecto
}*/


  demoEmpresas.push(nuevaEmpresa);
  localStorage.setItem('demoEmpresas', JSON.stringify(demoEmpresas));
  this.empresas = demoEmpresas;
  this.updatePaginatedEmpresas();
  this.selectedEmpresaId = nuevaEmpresa;
  localStorage.setItem('selectedEmpresaId', String(nuevaEmpresa.id));
  localStorage.setItem('selectedEmpresa', JSON.stringify(nuevaEmpresa));

  this.actualizarImagenEmpresa(nuevaEmpresa);
  this.appToast.success('Empresa creada en modo demo');
  this.limpiarEmpresaForm();
  return;
}


    if (!this.empresaName.trim()) {
      this.appToast.error('El nombre de la empresa es obligatorio.');
      console.error('[EMPRESA] El nombre de la empresa es obligatorio.');
      return;
    }
    if (!this.userCode.trim()) {
      this.appToast.error('El código de usuario es obligatorio.');
      console.error('[EMPRESA] El código de usuario es obligatorio.');
      return;
    }
    if (!this.logoUrl) {
      this.appToast.error('Por favor, sube una imagen para la empresa.');
      console.error('[EMPRESA] Falta logoUrl.');
      return;
    }

    const syncedUploadedImage = localStorage.getItem('uploadedImage') || '';
    const resolvedLogoUrl = navigator.onLine && this.logoUrl.startsWith('data:image/')
      ? syncedUploadedImage || this.logoUrl
      : this.logoUrl;

    const formData: Empresa = {
      name: this.empresaName,
      phone: this.empresaPhone,
      email: this.empresaEmail,
      description: this.additionalDetailsEmpresa,
      logoUrl: resolvedLogoUrl,
      userCode: this.userCode,
      website: this.empresaWebsite,
      tiktok: this.empresaTikTok,
      instagram: this.empresaInstagram,
      facebook: this.empresaFacebook,
      cuilCuit: this.empresaCuilCuit,
      primaryColor: this.presupuestoColorPrimario,
      secondaryColor: this.presupuestoColorSecundario,
      secondaryColor2: this.presupuestoColorSecundario2,
      gradientAngle: this.presupuestoGradienteAngulo,
      textColor: this.presupuestoColorTexto,
      tableColor: this.presupuestoColorTabla,
      tableTextColor: this.presupuestoColorTablaTexto,
      tableBodyColor: this.presupuestoColorTablaCuerpo,
      infoBoxColorHex: this.presupuestoInfoBoxColorHex,
      infoBoxOpacity: this.presupuestoInfoBoxOpacity
    };
    if (this.empresaEditId !== null) {
      // Modo edición: actualizar empresa existente
      this.empresaService.updateEmpresa(this.empresaEditId, formData).subscribe({
        next: (empresaActualizada) => {
          this.appToast.success(
            Number(empresaActualizada?.id) < 0
              ? 'Empresa actualizada localmente. Se sincronizara cuando vuelva la conexion.'
              : 'Empresa actualizada correctamente',
            'Exito'
          );
          this.applySavedEmpresa({ ...formData, ...empresaActualizada, id: this.empresaEditId ?? empresaActualizada.id });
          if (navigator.onLine) {
            this.getEmpresasByUserCode();
          }
          this.limpiarEmpresaForm();
        },
        error: (err) => {
          this.appToast.error(`Error al actualizar la empresa: ${err.message}`);
          console.error('[EMPRESA] Error al actualizar empresa:', err);
        }
      });
    } else {
      // Modo creación: crear nueva empresa
      this.empresaService.saveEmpresa(formData).subscribe({
        next: (empresaCreada) => {
          this.appToast.success(
            Number(empresaCreada?.id) < 0
              ? 'Empresa guardada localmente. Se sincronizara cuando vuelva la conexion.'
              : 'Datos de la empresa guardados',
            'Exito'
          );
          this.applySavedEmpresa(empresaCreada);
          if (navigator.onLine) {
            this.getEmpresasByUserCode();
          }
          this.limpiarEmpresaForm();
        },
        error: (err) => {
          this.appToast.error(`Error al guardar la empresa: ${err.message}`);
          console.error('[EMPRESA] Error al crear empresa:', err);
        }
      });
    }
  }

  limpiarEmpresaForm(): void {
    this.empresaEditId = null;
    this.empresaName = '';
    this.empresaPhone = '';
    this.empresaEmail = '';
    this.additionalDetailsEmpresa = '';
    this.empresaWebsite = '';
    this.empresaTikTok = '';
    this.empresaInstagram = '';
    this.empresaFacebook = '';
    this.empresaCuilCuit = '';
    this.logoUrl = '';
    if (this.modalImagePreview) {
      this.modalImagePreview.nativeElement.style.display = 'none';
    }
    if (this.imageInput) {
      this.imageInput.nativeElement.value = '';
    }
  }






  onDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.budgetDate = input.value;
  }






  saveClientData(form: NgForm): void {

    if (!this.validateForm(form)) {
      return;
    }

    if (!this.selectedEmpresaId?.id) {
      this.appToast.error('Debe seleccionar una empresa', 'Error');
      return;
    }

    const clientData: Cliente = {
      name: this.clientName,
      contact: this.clientContact,
      budgetDate: this.budgetDate,
      additionalDetails: this.additionalDetailsClient,
      userCode: this.userCode,
      email: this.clientEmail,
      clave: this.clientClave,
      direccion: this.clientDireccion,
      empresaId: this.selectedEmpresaId.id // Usa selectedEmpresaId.id
    };

    if (this.trialMode) {

  const demoClientes = Object.keys(localStorage)
    .filter(key => key.startsWith('demoCliente_'))
    .map(key => JSON.parse(localStorage.getItem(key) || '{}'))
    .filter(c => c && c.empresaId === this.selectedEmpresaId?.id);

  if (demoClientes.length >= 2) {
    this.appToast.info('En modo demo solo podés crear 1 cliente', 'Modo demo');
    return;
  }
  const clientData: Cliente = {
    name: this.clientName,
    contact: this.clientContact,
    budgetDate: this.budgetDate,
    additionalDetails: this.additionalDetailsClient,
    userCode: this.userCode,
    email: this.clientEmail,
    clave: this.clientClave,
    direccion: this.clientDireccion,
    empresaId: this.selectedEmpresaId.id
  };

  // Guardar localmente en demo
  const localId = Date.now();
  const localCliente = { ...clientData, id: localId };
  localStorage.setItem(`demoCliente_${localId}`, JSON.stringify(localCliente));

  this.applySavedCliente(localCliente);
  this.finishClientSaveFlow('Cliente guardado en modo demo');
  return;
}


    this.isSavingClient = true;
    this.clienteService.saveCliente(clientData).subscribe({
      next: (cliente) => {
        localStorage.setItem(`clientData_${cliente.id || Date.now()}`, JSON.stringify(cliente));
        this.applySavedCliente(cliente);
        this.finishClientSaveFlow(
          Number(cliente?.id) < 0
            ? 'Cliente guardado localmente. Se sincronizara cuando vuelva la conexion.'
            : 'Cliente guardado con exito'
        );
      },
      error: (error) => {
        localStorage.setItem(`clientData_temp_${Date.now()}`, JSON.stringify(clientData));
        console.error('Error al guardar cliente:', error.message, clientData);
        this.appToast.error(error.message || 'Error al guardar el cliente');
        this.isSavingClient = false;
      }
    });
  }

  validateForm(form: NgForm): boolean {
    if (!form.valid) {
      const nameCtrl = form.controls['clientName'];
      const contactCtrl = form.controls['clientContact'];
      const dateCtrl = form.controls['budgetDate'];
      const emailCtrl = form.controls['clientEmail'];
      const claveCtrl = form.controls['clientClave'];
      const direccionCtrl = form.controls['clientDireccion'];
      if (!nameCtrl?.valid) {
        this.appToast.error(nameCtrl?.errors?.['minlength'] ? 'El nombre debe tener al menos 2 caracteres' : 'El nombre es obligatorio');
      }
      if (!contactCtrl?.valid) {
        this.appToast.error(contactCtrl?.errors?.['pattern'] ? 'El contacto debe ser un número de teléfono válido (7-15 dígitos, puede incluir +)' : 'El contacto es obligatorio');
      }
      if (!dateCtrl?.valid || !this.budgetDate || this.budgetDate === '0000-00-00') {
        this.appToast.error('La fecha del presupuesto es obligatoria y debe ser válida');
      }
      if (!emailCtrl?.valid) {
        this.appToast.error(emailCtrl?.errors?.['email'] ? 'El email debe tener un formato válido' : 'El email es obligatorio');
      }
      if (!claveCtrl?.valid) {
        this.appToast.error(claveCtrl?.errors?.['pattern'] ? 'El CUIT debe tener el formato XX-XXXXXXXX-X' : 'El CUIT es obligatorio');
      }
      if (!direccionCtrl?.valid) {
        this.appToast.error(direccionCtrl?.errors?.['minlength'] ? 'La dirección debe tener al menos 5 caracteres' : 'La dirección es obligatoria');
      }
      console.error('Formulario inválido:', form.controls);
      return false;
    }
    if (!this.userCode || this.userCode.trim().length === 0) {
      this.appToast.error('El código de usuario es obligatorio');
      console.error('userCode inválido:', this.userCode);
      return false;
    }
    return true;
  }




 abrirModalImagen() {
  this.reabrirEmpresaModal = true;
    // Cierra el modal de empresa si está abierto
    const empresaModal = document.getElementById('exampleModal');
    if (empresaModal && empresaModal.classList.contains('show')) {
      bootstrap.Modal.getInstance(empresaModal)?.hide();
    }
    // Abre el modal de imagen
    const imageModal = document.getElementById('imageModal');
    if (imageModal) {
      const modal = new bootstrap.Modal(imageModal);
      modal.show();
    }
  }





      mostrarAlerta(mensaje: string): void {
        this.appToast.success(mensaje);
      }




    disminuirPrecios(): void {
    const porcentaje = parseFloat(this.porcentajeBajar);
    if (isNaN(porcentaje) || porcentaje <= 0) {
      this.appToast.error('Por favor, ingrese un porcentaje válido para bajar', 'Error');
      return;
    }
    this.tareasAgregadas = this.tareasAgregadas.map(tarea => ({
      ...tarea,
      costo: tarea.costo * (1 - porcentaje / 100),
      totalCost: this.calcularTotalCosto({ ...tarea, costo: tarea.costo * (1 - porcentaje / 100) })
    }));
    this.appToast.success(`Lista reducida en ${porcentaje}%`, 'Éxito');
    this.porcentajeBajar = null;
    localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
  }

  ajustarPrecios(): void {
    const porcentaje = parseFloat(this.porcentajeSubir);
    if (isNaN(porcentaje) || porcentaje <= 0) {
      this.appToast.error('Por favor, ingrese un porcentaje válido para subir', 'Error');
      return;
    }
    this.tareasAgregadas = this.tareasAgregadas.map(tarea => ({
      ...tarea,
      costo: tarea.costo * (1 + porcentaje / 100),
      totalCost: this.calcularTotalCosto({ ...tarea, costo: tarea.costo * (1 + porcentaje / 100) })
    }));
    this.appToast.success(`Lista incrementada en ${porcentaje}%`, 'Éxito');
    this.porcentajeSubir = null;
    localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
  }

  reestablecerPreciosOriginalesLista(): void {
    if (!this.clienteSeleccionado?.id && !this.trialMode) {
      this.appToast.warning('No hay un cliente seleccionado para restablecer los precios.', 'Atención');
      return;
    }

    if (this.trialMode) {
       this.appToast.info('Función limitada en modo de prueba', 'Aviso');
       return;
    }

    this.userTareaService.getTareasByClienteId(this.clienteSeleccionado!.id as number).subscribe({
      next: (tareasOriginales) => {
        this.tareasAgregadas = tareasOriginales;
        this.mostrarTabla = this.tareasAgregadas.length > 0;
        localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
        this.appToast.success('Precios restablecidos a los valores originales', 'Éxito');
      },
      error: () => {
        this.appToast.error('Error al restablecer los precios originales', 'Error');
      }
    });
  }

  cambiarTamanoFuenteLista(accion: 'increase' | 'decrease'): void {
    const tabla = document.getElementById('tabla');
    if (!tabla) return;

    const currentSize = window.getComputedStyle(tabla).fontSize;
    let newSize = parseFloat(currentSize);

    if (accion === 'increase') {
      newSize += 1;
    } else {
      newSize -= 1;
    }

    tabla.style.setProperty('font-size', `${newSize}px`, 'important');
    const cells = tabla.querySelectorAll('td, th, span, div');
    cells.forEach(cell => {
      (cell as HTMLElement).style.setProperty('font-size', `${newSize}px`, 'important');
    });
  }



  loadUserCode(): void {
    this.userCode = localStorage.getItem('userCode') || '';
    if (this.userCode) {
      this.fetchUserData();
      this.cargarTareasPersonalizadas();
    } else {
      this.appToast.error('Código de usuario no encontrado en el localStorage', 'Error');
      this.route.navigate(['']); // Redirigir al login
    }
  }



getClientesByUserCode(): void {
    if (!this.userCode) {
      this.appToast.error('Código de usuario no encontrado', 'Error');
      return;
    }
    this.clienteService.getClienteByUserCode(this.userCode).subscribe({
      next: (clientes) => {
        this.clientes = clientes || [];
          this.updatePaginatedClientes();
      },
      error: (error) => {
        console.error('Error en getClientesByUserCode:', error);
        this.appToast.error(error.message || 'Error al cargar los clientes');
      }
    });
}





openListaClientesModal(): void {
    this.getClientesByUserCode();
    const modalElement = document.getElementById('listaClientesModal');
    if (!modalElement) {
      console.error('Modal listaClientesModal no encontrado en el DOM');
      this.appToast.error('Error al abrir la lista de clientes');
      return;
    }
    const listaModal = new bootstrap.Modal(modalElement);
    listaModal.show();
}


fetchUserData(): void {
  const cachedRaw = localStorage.getItem('userData');
  const hasCachedData = !!cachedRaw;

  if (hasCachedData) {
    try {
      this.userData = JSON.parse(cachedRaw!);
      if (this.userData?.fechaVencimiento) {
        this.calculateRemainingTime(this.userData.fechaVencimiento);
      }
      this.loadProvincias();
      this.obtenerTareas();
      this.loadWeather();
    } catch { /* ignore parse error */ }
  }

  this.authService.getUserCode(this.userCode).pipe(takeUntil(this.destroy$)).subscribe({
    next: response => {
      this.userData = response;
      localStorage.setItem('userData', JSON.stringify(this.userData));
      void this.localStore.setState(this.dashboardStateKey('userData'), this.userData).catch(() => {});
      if (this.userData.fechaVencimiento) {
        this.calculateRemainingTime(this.userData.fechaVencimiento);
      }
      if (!hasCachedData) {
        this.loadProvincias();
        this.obtenerTareas();
        this.loadWeather();
      }
    },
    error: async error => {
      if (hasCachedData) return;
      console.error('Error al obtener datos del usuario:', error);
      const indexedUserData = await this.localStore.getState<any>(this.dashboardStateKey('userData'));
      if (indexedUserData) {
        this.userData = indexedUserData;
        localStorage.setItem('userData', JSON.stringify(this.userData));
        if (this.userData?.fechaVencimiento) {
          this.calculateRemainingTime(this.userData.fechaVencimiento);
        }
        this.loadProvincias();
        this.obtenerTareas();
        this.loadWeather();
        this.appToast.info('Usando datos locales del usuario mientras no haya conexion.');
        return;
      }
      this.appToast.error('Error al obtener los datos del usuario', 'Error');
      this.route.navigate(['']);
    }
  });
}



  loadProvincias(): void {
    if (this.userData?.pais) {
      this.provinciaService.getProvinciasByPais(this.userData.pais).pipe(takeUntil(this.destroy$)).subscribe(
        provincias => {
          this.provincias = provincias;
          this.cacheProvincias(this.userData?.pais || '', provincias);
        },
        error => {
          const cached = this.getCachedProvincias(this.userData?.pais);
          if (cached.length > 0) {
            this.provincias = cached;
            return;
          }
          this.appToast.error('Error al cargar las provincias', 'Error');
        }
      );
    } else {
      console.warn('No se pudo cargar provincias: userData.pais no está disponible', this.userData); // Depuración
    }
  }




  onEmpresaSeleccionada(empresa: any): void {
    const normalizedEmpresa = this.normalizeEmpresaSelection(empresa);
    if (!normalizedEmpresa) {
      return;
    }

    const currentEmpresaId = Number(this.empresaStore.selected()?.id ?? null);
    if (Number.isFinite(currentEmpresaId) && currentEmpresaId === Number(normalizedEmpresa.id)) {
      this.selectedEmpresaId = normalizedEmpresa;
      this.syncSelectedEmpresaStorage(normalizedEmpresa);
      this.cargarDatosEmpresaSeleccionada();
      void this.actualizarImagenEmpresa(normalizedEmpresa);
      return;
    }

    this.clearEmpresaDependentState();

    if (this.trialMode) {
      // Demo: cargar clientes hardcodeados + localStorage
      this.selectedEmpresaId = normalizedEmpresa;
      this.syncSelectedEmpresaStorage(normalizedEmpresa);
      this.cargarDatosEmpresaSeleccionada();
      void this.actualizarImagenEmpresa(normalizedEmpresa);
      if (normalizedEmpresa?.id) {
        const demoClientes = Object.keys(localStorage)
          .filter(key => key.startsWith('demoCliente_'))
          .map(key => JSON.parse(localStorage.getItem(key) || '{}'))
          .filter(c => c && c.empresaId === normalizedEmpresa.id);
        const testClients: Cliente[] = [
          { id: 10001, name: 'Constructora del Sol S.A.', contact: '11-4455-6677', email: 'contacto@constructoradelsol.com', direccion: 'Av. Libertador 1500, CABA', budgetDate: new Date().toISOString().split('T')[0], empresaId: normalizedEmpresa.id, additionalDetails: 'Cliente corporativo - Refacción oficinas', userCode: 'demo', clave: '30-12345678-9' },
          { id: 10002, name: 'Ing. Ricardo Martínez', contact: '221-555-0987', email: 'rmartinez@email.com', direccion: 'Calle 50 nro 123, La Plata', budgetDate: new Date().toISOString().split('T')[0], empresaId: normalizedEmpresa.id, additionalDetails: 'Particular - Proyecto vivienda unifamiliar', userCode: 'demo', clave: '20-98765432-1' }
        ];
        this.clientes = [...testClients, ...demoClientes];
        this.updatePaginatedClientes();
        const savedId = localStorage.getItem('selectedClienteId');
        const clienteFinal = (savedId ? this.clientes.find(c => String(c.id) === savedId) : null) ?? this.clientes[0];
        if (clienteFinal) this.seleccionarCliente(clienteFinal);
      }
      return;
    }

    // Modo autenticado: el store maneja todo el cascade reactivamente
    this.empresaStore.select(normalizedEmpresa);
  }






      calculateRemainingTime(fechaVencimiento: string): void {
        if (!fechaVencimiento) {
          this.remainingTime = 'Fecha de vencimiento no disponible';
          return;
        }
        const now = new Date().getTime();
        const expiryDate = new Date(fechaVencimiento).getTime();
        if (isNaN(expiryDate)) {
          this.remainingTime = 'Fecha inválida';
          return;
        }
        const timeDiff = expiryDate - now;
        if (timeDiff <= 0) {
          this.remainingTime = 'Código expirado';
          return;
        }
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
        this.remainingTime = `${days}d ${hours}h ${minutes}m ${seconds}s restantes`;
        //console.log('Tiempo restante:', this.remainingTime);
      }

  private _logoResolveToken: symbol | null = null;

  async actualizarImagenEmpresa(empresa: any): Promise<void> {
    const token = Symbol();
    this._logoResolveToken = token;
    const resolvedLogoUrl = await this.resolveEmpresaLogoUrl(empresa);
    // Si mientras esperábamos cambió la empresa, descartar el resultado
    if (this._logoResolveToken !== token) return;
    this.currentEmpresaLogoUrl = resolvedLogoUrl || '';
    const logoKey = this.empresaLogoKey(empresa);
    if (logoKey) {
      this.empresaLogoUrls = {
        ...this.empresaLogoUrls,
        [logoKey]: resolvedLogoUrl || String(empresa?.logoUrl || '')
      };
    }
    const imageElement = document.getElementById('fixedImageIcon') as HTMLImageElement;
    if (resolvedLogoUrl && imageElement) {
      imageElement.onerror = () => {
        imageElement.onerror = null;
        imageElement.src = '#';
        imageElement.style.display = 'none';
      };
      imageElement.src = resolvedLogoUrl;
      imageElement.style.display = 'block';
    } else if (imageElement) {
      imageElement.onerror = null;
      imageElement.src = '#';
      imageElement.style.display = 'none';
    }
  }

  toggleSocialFields() {
    this.showSocialFields = !this.showSocialFields;
  }

  private hasSocialData(): boolean {
    return !!(this.empresaTikTok || this.empresaInstagram || this.empresaFacebook || this.empresaWebsite);
  }

  async loadWeather(): Promise<void> {
    const location = this.getLocationName();
    if (!location) {
      this.weatherError = 'Sin ubicación configurada';
      return;
    }
    const cachedWeather = this.getCachedWeather(location);
    if (!navigator.onLine && cachedWeather) {
      this.currentWeather = cachedWeather.currentWeather;
      this.dailyForecast = cachedWeather.dailyForecast;
      this.weatherError = '';
      return;
    }
    this.weatherLoading = true;
    this.weatherError = '';
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=es&format=json`;
      const geoResponse: any = await firstValueFrom(this.http.get(geoUrl));
      const place = geoResponse?.results?.[0];
      if (!place) {
        throw new Error('Ubicación no encontrada');
      }
      const { latitude, longitude, name, country } = place;
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
      const weatherResponse: any = await firstValueFrom(this.http.get(weatherUrl));
      const current = weatherResponse?.current_weather;
      if (current) {
        this.currentWeather = {
          temperature: current.temperature,
          windspeed: current.windspeed,
          weathercode: current.weathercode,
          location: `${name}${country ? ', ' + country : ''}`
        };
      }
      const daily = weatherResponse?.daily;
      if (daily?.time) {
        this.dailyForecast = daily.time.slice(0, 5).map((dateStr: string, index: number) => ({
          date: new Date(dateStr),
          max: daily.temperature_2m_max?.[index] ?? null,
          min: daily.temperature_2m_min?.[index] ?? null,
          code: daily.weathercode?.[index] ?? 0
        }));
      } else {
        this.dailyForecast = [];
      }
      this.cacheWeather(location, {
        currentWeather: this.currentWeather,
        dailyForecast: this.dailyForecast
      });
    } catch (error) {
      console.error('Error al cargar clima', error);
      if (cachedWeather) {
        this.currentWeather = cachedWeather.currentWeather;
        this.dailyForecast = cachedWeather.dailyForecast;
        this.weatherError = 'Mostrando el ultimo clima guardado localmente.';
      } else {
        this.weatherError = 'No se pudo cargar el clima. Intenta más tarde.';
      }
    } finally {
      this.weatherLoading = false;
    }
  }

  private getLocationName(): string {
    return this.userData?.provincia || this.userData?.pais || 'Buenos Aires';
  }

  weatherDescription(code: number): string {
    const map: Record<number, string> = {
      0: 'Despejado',
      1: 'Mayormente despejado',
      2: 'Parcialmente nublado',
      3: 'Nublado',
      45: 'Niebla',
      48: 'Niebla con escarcha',
      51: 'Llovizna ligera',
      53: 'Llovizna',
      55: 'Llovizna intensa',
      61: 'Lluvia ligera',
      63: 'Lluvia',
      65: 'Lluvia intensa',
      71: 'Nieve ligera',
      73: 'Nieve',
      75: 'Nieve intensa',
      80: 'Chubascos ligeros',
      81: 'Chubascos',
      82: 'Chubascos intensos',
      95: 'Tormenta',
      96: 'Tormenta con granizo',
      99: 'Tormenta fuerte'
    };
    return map[code] || 'Condición desconocida';
  }

  loadRecentTasks(): void {
    const stored = localStorage.getItem('recentQuotedTasks');
    this.recentTasks = stored ? JSON.parse(stored) : [];
  }

  saveToRecent(tarea: any): void {
    if (!tarea || !tarea.tarea) return;

    const taskToSave = {
      tarea: tarea.tarea,
      costo: tarea.costo,
      rubro: tarea.rubro,
      categoria: tarea.categoria,
      pais: tarea.pais || (this.userData ? this.userData.pais : 'Argentina'),
      descripcion: tarea.descripcion || '',
      area: tarea.area || 1,
      totalCost: tarea.totalCost || tarea.costo
    };

    // Use a unique key combining name and description
    const taskKey = `${taskToSave.tarea}_${taskToSave.descripcion}`;

    const index = this.recentTasks.findIndex(t => `${t.tarea}_${t.descripcion}` === taskKey);
    if (index !== -1) {
      this.recentTasks.splice(index, 1);
    }

    this.recentTasks.unshift(taskToSave);
    this.recentTasks = this.recentTasks.slice(0, 10);
    localStorage.setItem('recentQuotedTasks', JSON.stringify(this.recentTasks));
  }

  cargarTareaReciente(tarea: any): void {
    this.tareaSeleccionada = { ...tarea };

    // Close the recent tasks modal
    const modalEl = document.getElementById('recentTasksModal');
    if (modalEl) {
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();
    }

    // Ensure the add task modal is open
    const miModalEl = document.getElementById('miModal');
    if (miModalEl) {
      const miModalInstance = bootstrap.Modal.getInstance(miModalEl) || new bootstrap.Modal(miModalEl);
      miModalInstance.show();
    }

    this.appToast.info('Tarea cargada para editar', 'Historial');
  }

  borrarHistorialReciente(): void {
    this.recentTasks = [];
    localStorage.removeItem('recentQuotedTasks');
    this.appToast.success('Historial de tareas limpiado');
  }

  abrirHistorialDesdeModal(): void {
    // 1. Cerrar el modal actual (Agregar Tarea)
    const miModalEl = document.getElementById('miModal');
    if (miModalEl) {
      const miModalInstance = bootstrap.Modal.getInstance(miModalEl);
      if (miModalInstance) miModalInstance.hide();
    }

    // 2. Esperar un poquito y abrir el de historial
    setTimeout(() => {
      const recentTasksModalEl = document.getElementById('recentTasksModal');
      if (recentTasksModalEl) {
        const recentModalInstance = bootstrap.Modal.getInstance(recentTasksModalEl) || new bootstrap.Modal(recentTasksModalEl);
        recentModalInstance.show();
      }
    }, 150);
  }

  abrirModalPaleta(): void {
    const empresaModalEl = document.getElementById('exampleModal');
    if (empresaModalEl) {
      const inst = bootstrap.Modal.getInstance(empresaModalEl);
      if (inst) inst.hide();
    }

    setTimeout(() => {
      const paletaModalEl = document.getElementById('paletaModal');
      if (paletaModalEl) {
        const paletaModalInstance = new bootstrap.Modal(paletaModalEl);
        paletaModalInstance.show();
      }
    }, 450);
  }

  volverAModalEmpresa(): void {
    const paletaModalEl = document.getElementById('paletaModal');
    if (paletaModalEl) {
      const inst = bootstrap.Modal.getInstance(paletaModalEl);
      if (inst) inst.hide();
    }

    setTimeout(() => {
      const empresaModalEl = document.getElementById('exampleModal');
      if (empresaModalEl) {
        const empresaModalInstance = new bootstrap.Modal(empresaModalEl);
        empresaModalInstance.show();
      }
    }, 450);
  }

  aplicarPaletaManual(): void {
    if (!this.selectedEmpresaId) return;

    this.selectedEmpresaId.primaryColor = this.presupuestoColorPrimario;
    this.selectedEmpresaId.secondaryColor = this.presupuestoColorSecundario;
    this.selectedEmpresaId.secondaryColor2 = this.presupuestoColorSecundario2;
    this.selectedEmpresaId.gradientAngle = this.presupuestoGradienteAngulo;
    this.selectedEmpresaId.textColor = this.presupuestoColorTexto;
    this.selectedEmpresaId.tableColor = this.presupuestoColorTabla;
    this.selectedEmpresaId.tableTextColor = this.presupuestoColorTablaTexto;
    this.selectedEmpresaId.tableBodyColor = this.presupuestoColorTablaCuerpo;
    this.selectedEmpresaId.infoBoxColorHex = this.presupuestoInfoBoxColorHex;
    this.selectedEmpresaId.infoBoxOpacity = this.presupuestoInfoBoxOpacity;

    localStorage.setItem('selectedEmpresa', JSON.stringify(this.selectedEmpresaId));

    if (this.trialMode) {
      const demoEmpresasStr = localStorage.getItem('demoEmpresas');
      if (demoEmpresasStr) {
        const demoEmpresas = JSON.parse(demoEmpresasStr);
        const index = demoEmpresas.findIndex((e: any) => e.id === this.selectedEmpresaId?.id);
        if (index !== -1) {
          demoEmpresas[index] = this.selectedEmpresaId;
          localStorage.setItem('demoEmpresas', JSON.stringify(demoEmpresas));
        }
      }
      this.appToast.success('Colores aplicados (modo demo)', 'Paleta');
      return;
    }

    if (this.selectedEmpresaId.id) {
      this.empresaService.updateEmpresa(this.selectedEmpresaId.id, this.selectedEmpresaId).subscribe({
        next: () => this.appToast.success('Colores guardados correctamente', 'Paleta'),
        error: (err) => this.appToast.error(`Error al guardar colores: ${err.message}`, 'Error')
      });
    }
  }

  // ── Tareas Personalizadas ────────────────────────────────────────────────
  private readonly TP_DEMO_KEY = 'demo_tareas_personalizadas';
  private readonly TP_LIMIT_DEMO = 5;
  private readonly TP_LIMIT_VIP = 500;

  private tpLoadDemo(): TareaPersonalizada[] {
    try { return JSON.parse(localStorage.getItem(this.TP_DEMO_KEY) || '[]'); } catch { return []; }
  }

  private tpSaveDemo(list: TareaPersonalizada[]): void {
    try { localStorage.setItem(this.TP_DEMO_KEY, JSON.stringify(list)); } catch {}
  }

  toggleTareasPersonalizadasPanel(): void {
    this.showTareasPersonalizadasPanel = !this.showTareasPersonalizadasPanel;
    if (this.showTareasPersonalizadasPanel) {
      this.tpMostrarImportar = false;
      this.tpCancelarEdicion();
      if (this.trialMode) {
        this.tareasPersonalizadas = this.tpLoadDemo();
      } else {
        this.tpService.syncPending(this.userCode).subscribe();
      }
    }
  }

  cargarTareasPersonalizadas(): void {
    if (this.trialMode) {
      this.tareasPersonalizadas = this.ordenarTareasPersonalizadas(this.tpLoadDemo());
      return;
    }
    if (!this.userCode) return;
    this.tpService.getByUserCode(this.userCode).subscribe({
      next: list => this.tareasPersonalizadas = this.ordenarTareasPersonalizadas(list),
      error: () => {}
    });
  }

  async tpGuardar(): Promise<void> {
    this.tpSubmitted = true;
    if (!this.tpForm.tarea.trim()) {
      this.appToast.warning('El nombre de la tarea es obligatorio', 'Campo requerido');
      return;
    }
    if (!this.tpForm.costo || this.tpForm.costo <= 0) {
      this.appToast.warning('El costo debe ser mayor a 0', 'Campo requerido');
      return;
    }

    const isNew = this.tpEditingId == null;
    const limit = this.trialMode ? this.TP_LIMIT_DEMO : this.TP_LIMIT_VIP;
    if (isNew && this.tareasPersonalizadas.length >= limit) {
      this.appToast.warning(
        `Alcanzaste el límite de ${limit} tareas personalizadas`,
        'Límite alcanzado'
      );
      return;
    }

    const payload: TareaPersonalizada = {
      userCode: this.userCode,
      tarea: this.tpForm.tarea.trim(),
      descripcion: this.tpForm.descripcion.trim(),
      costo: this.tpForm.costo
    };

    const confirmed = await this.tpConfirmarGuardado(payload.tarea, isNew);
    if (!confirmed) {
      return;
    }

    if (this.trialMode) {
      const list = this.tpLoadDemo();
      if (this.tpEditingId != null) {
        const idx = list.findIndex(t => t.id === this.tpEditingId);
        if (idx !== -1) list[idx] = { ...payload, id: this.tpEditingId };
      } else {
        list.unshift({ ...payload, id: -Date.now() });
      }
      this.tpSaveDemo(list);
      this.tareasPersonalizadas = this.ordenarTareasPersonalizadas(list);
      this.cerrarTpEditor();
      void this.tpMostrarMensajeGuardado(payload.tarea, isNew);
      return;
    }

    if (this.tpEditingId != null) {
      this.tpService.update(this.tpEditingId, payload).subscribe({
        next: updated => {
          const idx = this.tareasPersonalizadas.findIndex(t => t.id === this.tpEditingId);
          if (idx !== -1) this.tareasPersonalizadas[idx] = updated;
          this.tareasPersonalizadas = this.ordenarTareasPersonalizadas(this.tareasPersonalizadas);
          this.cerrarTpEditor();
          void this.tpMostrarMensajeGuardado(updated.tarea, false);
        },
        error: err => this.appToast.error(err.message, 'Error al actualizar')
      });
    } else {
      this.tpService.create(payload).subscribe({
        next: created => {
          this.tareasPersonalizadas = this.ordenarTareasPersonalizadas([created, ...this.tareasPersonalizadas]);
          this.cerrarTpEditor();
          void this.tpMostrarMensajeGuardado(created.tarea, true);
        },
        error: err => this.appToast.error(err.message, 'Error al guardar')
      });
    }
  }

  private tpConfirmarGuardado(nombreTarea: string, isNew: boolean): Promise<boolean> {
    const title = isNew ? '¿Crear tarea personalizada?' : '¿Guardar cambios?';
    const text = isNew
      ? `Se agregará "${nombreTarea}" a Mis Tareas.`
      : `Se actualizará "${nombreTarea}" en Mis Tareas.`;
    const confirmButtonText = isNew ? 'Sí, crear tarea' : 'Sí, guardar cambios';

    return this.uiDialog.confirm({ title, text, confirmText: confirmButtonText, cancelText: 'Cancelar', tone: 'primary', icon: 'question' });
  }

  private tpMostrarMensajeGuardado(nombreTarea: string, isNew: boolean): Promise<void> {
    const title = isNew ? 'Tarea creada' : 'Tarea actualizada';
    const text = isNew
      ? `"${nombreTarea}" ya está disponible en tu lista de tareas personalizadas.`
      : `Los cambios de "${nombreTarea}" se guardaron correctamente.`;

    return this.uiDialog.success({ title, text });
  }

  tpEditar(tp: TareaPersonalizada): void {
    this.tpEditingId = tp.id ?? null;
    this.tpSubmitted = false;
    this.tpForm = { tarea: tp.tarea, descripcion: tp.descripcion, costo: tp.costo };
    this.tpMostrarImportar = false;
    this.showTpEditorModal = true;
  }

  tpCancelarEdicion(): void {
    this.tpEditingId = null;
    this.tpSubmitted = false;
    this.tpForm = { tarea: '', descripcion: '', costo: 0 };
    this.tpMostrarImportar = false;
    this.tpFiltroCatalogo = '';
  }

  abrirTpEditor(): void {
    this.tpCancelarEdicion();
    this.showTpEditorModal = true;
  }

  cerrarTpEditor(): void {
    this.showTpEditorModal = false;
    this.tpCancelarEdicion();
  }

  tpEliminar(tp: TareaPersonalizada): void {
    if (tp.id == null) return;
    this.appToast.confirm(`Se eliminará "${tp.tarea}" de tus tareas personalizadas.`, '¿Eliminar tarea?').then(confirmed => {
      if (!confirmed) return;
      if (this.trialMode) {
        const list = this.tpLoadDemo().filter(t => t.id !== tp.id);
        this.tpSaveDemo(list);
        this.tareasPersonalizadas = this.ordenarTareasPersonalizadas(list);
        this.appToast.success(`"${tp.tarea}" eliminada`, 'Tarea eliminada');
        return;
      }
      this.tpService.delete(tp.id!, this.userCode).subscribe({
        next: () => {
          this.tareasPersonalizadas = this.tareasPersonalizadas.filter(t => t.id !== tp.id);
          this.appToast.success(`"${tp.tarea}" eliminada`, 'Tarea eliminada');
        },
        error: err => this.appToast.error(err.message, 'Error al eliminar')
      });
    });
  }

  tpAgregarAlPresupuesto(tp: TareaPersonalizada): void {
    this.tareaSeleccionada = {
      id: undefined,
      tarea: tp.tarea,
      descripcion: tp.descripcion,
      costo: tp.costo,
      area: 1,
      descuento: 0,
      totalCost: tp.costo,
      rubro: '',
      categoria: '',
      pais: this.userData?.pais || ''
    };
    this.showTareasPersonalizadasPanel = false;
    this.abrirModal();
  }

  tpImportarDelCatalogo(tarea: Tarea): void {
    const limit = this.trialMode ? this.TP_LIMIT_DEMO : this.TP_LIMIT_VIP;
    if (this.tareasPersonalizadas.length >= limit) {
      this.appToast.warning(
        `Alcanzaste el límite de ${limit} tareas personalizadas`,
        'Límite alcanzado'
      );
      return;
    }
    const payload: TareaPersonalizada = {
      userCode: this.userCode,
      tarea: tarea.tarea,
      descripcion: tarea.descripcion || '',
      costo: tarea.costo
    };
    if (this.trialMode) {
      const list = this.tpLoadDemo();
      const created: TareaPersonalizada = { ...payload, id: -Date.now() };
      list.unshift(created);
      this.tpSaveDemo(list);
      this.tareasPersonalizadas = this.ordenarTareasPersonalizadas(list);
      this.appToast.success(`"${created.tarea}" importada a Mis Tareas`, 'Importada');
      return;
    }
    this.tpService.create(payload).subscribe({
      next: created => {
        this.tareasPersonalizadas = this.ordenarTareasPersonalizadas([created, ...this.tareasPersonalizadas]);
        this.appToast.success(`"${created.tarea}" importada a Mis Tareas`, 'Importada');
        this.tpMostrarImportar = false;
      },
      error: err => this.appToast.error(err.message, 'Error al importar')
    });
  }

  exportarTareaAPersonalizadas(): void {
    const nombre = this.tareaSeleccionada.tarea?.trim();
    if (!nombre) {
      this.appToast.warning('Ingresá un nombre de tarea antes de exportar.');
      return;
    }

    const limit = this.trialMode ? this.TP_LIMIT_DEMO : this.TP_LIMIT_VIP;
    if (this.tareasPersonalizadas.length >= limit) {
      this.uiDialog.warning({ title: 'Límite alcanzado', text: `Alcanzaste el límite de ${limit} tareas personalizadas.` });
      return;
    }

    const yaExiste = this.tareasPersonalizadas.some(
      tp => tp.tarea.trim().toLowerCase() === nombre.toLowerCase()
    );
    if (yaExiste) {
      this.uiDialog.info({ title: 'Ya existe', text: `"${nombre}" ya está en tus tareas personalizadas.` });
      return;
    }

    this.uiDialog.confirm({
      title: '¿Guardar en Mis Tareas?',
      text: `"${nombre}" se agregará a tu lista de tareas personalizadas.`,
      confirmText: 'Guardar',
      cancelText: 'Cancelar',
      tone: 'primary',
      icon: 'question'
    }).then(confirmed => {
      if (!confirmed) return;

      const payload: TareaPersonalizada = {
        userCode: this.userCode,
        tarea: nombre,
        descripcion: this.tareaSeleccionada.descripcion || '',
        costo: this.tareaSeleccionada.costo
      };

      if (this.trialMode) {
        const list = this.tpLoadDemo();
        const created: TareaPersonalizada = { ...payload, id: -Date.now() };
        list.unshift(created);
        this.tpSaveDemo(list);
        this.tareasPersonalizadas = this.ordenarTareasPersonalizadas(list);
        this.appToast.success(`"${nombre}" guardada en Mis Tareas`, 'Exportada');
        return;
      }

      this.tpService.create(payload).subscribe({
        next: created => {
          this.tareasPersonalizadas = this.ordenarTareasPersonalizadas([created, ...this.tareasPersonalizadas]);
          this.appToast.success(`"${nombre}" guardada en Mis Tareas`, 'Exportada');
        },
        error: err => this.appToast.error(err.message || 'Error al exportar la tarea')
      });
    });
  }

  private ordenarTareasPersonalizadas(list: TareaPersonalizada[]): TareaPersonalizada[] {
    return [...list].sort((a, b) => {
      const aKey = Math.abs(Number(a.id ?? 0));
      const bKey = Math.abs(Number(b.id ?? 0));
      return bKey - aKey;
    });
  }

  get tpCatalogoFiltrado(): Tarea[] {
    if (!this.tpFiltroCatalogo.trim()) return this.tareasFiltradas.slice(0, 50);
    const q = this.tpFiltroCatalogo.toLowerCase();
    return this.tareas.filter(t => t.tarea.toLowerCase().includes(q)).slice(0, 50);
  }

  get tareasPersonalizadasFiltradas(): TareaPersonalizada[] {
    const query = this.tpBusquedaPersonalizada.trim().toLowerCase();
    if (!query) {
      return this.tareasPersonalizadas;
    }

    return this.tareasPersonalizadas.filter(tp =>
      tp.tarea.toLowerCase().includes(query) ||
      (tp.descripcion || '').toLowerCase().includes(query)
    );
  }
}




