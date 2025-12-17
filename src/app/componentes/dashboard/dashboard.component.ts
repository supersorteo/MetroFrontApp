import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../servicios/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Tarea, TareaService } from '../../servicios/tarea.service';
import { Provincia, ProvinciaService } from '../../servicios/provincia.service';
import { UserTarea, UserTareaService } from '../../servicios/user-tarea.service';
import { PresupuestoService } from '../../servicios/presupuesto.service';
import { Empresa, EmpresaService } from '../../servicios/empresa.service';
import { Cliente, ClienteService } from '../../servicios/cliente.service';
import Swal from 'sweetalert2';
import { NgSelectModule } from '@ng-select/ng-select';
import { FilterClientePipe } from '../../pipes/filter-cliente.pipe';
import { FilterEmpresaPipe } from '../../pipes/filter-empresa.pipe';
import { PresupuestosGuardadosComponent } from '../presupuestos-guardados/presupuestos-guardados.component';

import { firstValueFrom } from 'rxjs';
//import { SavedPresupuesto } from '../../servicios/budget-storage.service';
import { SavedPresupuesto } from '../../servicios/budget.service';


declare var bootstrap: any;

interface AccessCode {
  code: string;
  email: string;
  username: string;
  telefono: string;
  provincia: string;
  fechaRegistro: string;
  fechaVencimiento: string;
}



@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    NgSelectModule,
    FilterClientePipe,
    FilterEmpresaPipe,
    PresupuestosGuardadosComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit{

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
  tareasAgregadas: UserTarea[] = [];
  tareasDelCliente: UserTarea[] = [];
  isSidebarOpen: boolean = false;
  showSocialFields: boolean = false;
  weatherLoading: boolean = false;
  weatherError: string = '';
  currentWeather: { temperature: number; windspeed: number; weathercode: number; location: string } | null = null;
  dailyForecast: { date: Date; max: number; min: number; code: number }[] = [];


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
  tareasAgregadasUser: UserTarea[] = [];
  clientes: Cliente[] = [];

  paginatedClientes: Cliente[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 1;

  logoUrl: string = '';
  constructor(
    private authService: AuthService,
    private route:Router,
    private tareaService: TareaService,
    private provinciaService: ProvinciaService,
    private userTareaService: UserTareaService,
    private presupuestoService: PresupuestoService,
    private empresaService: EmpresaService,
    private clienteService: ClienteService,
    private toastr: ToastrService,
    private http: HttpClient ){}

  ngOnInit() {
    this.loadUserCode();
    this.loadTareasAgregadas();

    // Obtener empresas para el ng-select al iniciar
    setTimeout(() => {
      if (this.userCode) {
        this.getEmpresasByUserCode();
      }
    }, 0);

    // Recargar clientes si se editó alguno
    if (localStorage.getItem('reloadClientes')) {
      this.getClientesByUserCode();
      localStorage.removeItem('reloadClientes');
    }

    // Persistencia: cargar empresa seleccionada y su imagen
    setTimeout(() => {
      const selectedId = localStorage.getItem('selectedEmpresaId');
      if (selectedId && this.empresas && this.empresas.length > 0) {
        const empresa = this.empresas.find(e => String(e.id) === selectedId);
        if (empresa) {
          this.selectedEmpresaId = empresa;
          const imageElement = document.getElementById('fixedImageIcon') as HTMLImageElement;
          if (empresa.logoUrl && imageElement) {
            imageElement.src = empresa.logoUrl;
            imageElement.style.display = 'block';
          }
          console.log('Empresa seleccionada al iniciar:', empresa);
        }
      }
      // Restaurar selección de cliente (objeto completo)
      const storedCliente = localStorage.getItem('selectedCliente');
      if (storedCliente) {
        try {
          const clienteObj = JSON.parse(storedCliente);
          const cliente = this.clientes.find(c => c.id === clienteObj.id);
          if (cliente) {
            this.clienteSeleccionado = cliente;
            console.log('Cliente seleccionado al iniciar (objeto):', cliente);
          }
        } catch (e) {
          console.error('Error restaurando cliente seleccionado:', e);
        }
      }
    }, 500);



    setInterval(() => {
      if (this.userData?.fechaVencimiento) {
        this.calculateRemainingTime(this.userData.fechaVencimiento);
      }
    }, 1000);
    this.obtenerTareas();

    console.log('Estado inicial del formulario:', {
      clientName: this.clientName,
      clientContact: this.clientContact,
      budgetDate: this.budgetDate,
      userCode: this.userCode
    });

    const today = new Date();
    this.budgetDate = today.toISOString().split('T')[0];
    console.log('Fecha del presupuesto por defecto:', this.budgetDate);
    setTimeout(() => {
      this.budgetDate = this.budgetDate;
      console.log('Fecha forzada para binding:', this.budgetDate);
    }, 0);
  }

   seleccionarCliente(cliente: Cliente): void {
  this.clienteSeleccionado = cliente;
  localStorage.setItem('selectedClienteId', String(cliente.id));
  localStorage.setItem('selectedCliente', JSON.stringify(cliente));
  console.log('Cliente seleccionado:', cliente);
    }

  getEmpresasByUserCode0(): void {
    if (!this.userCode) {
      this.toastr.error('Código de usuario no encontrado', 'Error');
      console.error('[EMPRESA] Código de usuario no encontrado');
      return;
    }
    console.log('[EMPRESA] getEmpresasByUserCode para userCode:', this.userCode);
    this.empresaService.getEmpresaByUserCode(this.userCode).subscribe({
      next: (empresas) => {
        console.log('[EMPRESA] Empresas recibidas:', empresas);
        this.empresas = Array.isArray(empresas) ? empresas : [empresas];
        this.updatePaginatedEmpresas();
        // Lógica de imagen y selección
        const selectedId = localStorage.getItem('selectedEmpresaId');
        let empresaSeleccionada = null;
        if (selectedId) {
          empresaSeleccionada = this.empresas.find(e => String(e.id) === selectedId);
        }
        if (empresaSeleccionada) {
          this.selectedEmpresaId = empresaSeleccionada;
          this.actualizarImagenEmpresa(empresaSeleccionada);
          console.log('empresa seleccionada', this.selectedEmpresaId)
        } else if (this.empresas.length > 0) {
          this.selectedEmpresaId = this.empresas[0];
          console.log('empresa seleccionada', this.selectedEmpresaId)
          this.actualizarImagenEmpresa(this.empresas[0]);
          localStorage.setItem('selectedEmpresaId', String(this.empresas[0].id));
        } else {
          this.selectedEmpresaId = null;
          this.actualizarImagenEmpresa(null);
          localStorage.removeItem('selectedEmpresaId');
          console.log('empresa seleccionada', this.selectedEmpresaId)
        }
      },
      error: (error) => {
        this.toastr.error(error.message || 'Error al cargar las empresas');
        console.error('[EMPRESA] Error al cargar empresas:', error);
      }
    });
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
      this.showSocialFields = this.hasSocialData();
      // Si hay logo, actualizar imagen
      this.actualizarImagenEmpresa(this.selectedEmpresaId);
      console.log('Datos de empresa cargados en modal:', this.selectedEmpresaId);
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
      this.showSocialFields = false;
      this.actualizarImagenEmpresa(null);
      console.log('No hay empresa seleccionada');
    }
  }


getEmpresasByUserCode(): void {
    if (!this.userCode) {
      this.toastr.error('Código de usuario no encontrado', 'Error');
      console.error('[EMPRESA] Código de usuario no encontrado');
      return;
    }
    console.log('[EMPRESA] getEmpresasByUserCode para userCode:', this.userCode);
    this.empresaService.getEmpresaByUserCode(this.userCode).subscribe({
      next: (empresas) => {
        console.log('[EMPRESA] Empresas recibidas:', empresas);
        this.empresas = Array.isArray(empresas) ? empresas : [empresas];
        this.updatePaginatedEmpresas();
        // Lógica de selección de empresa
        const selectedId = localStorage.getItem('selectedEmpresaId');
        let empresaSeleccionada = null;
        if (selectedId) {
          empresaSeleccionada = this.empresas.find(e => String(e.id) === selectedId);
        }
        if (empresaSeleccionada) {
          this.selectedEmpresaId = empresaSeleccionada;
          this.actualizarImagenEmpresa(empresaSeleccionada);
          console.log('Empresa seleccionada:', this.selectedEmpresaId);
        } else if (this.empresas.length > 0) {
          this.selectedEmpresaId = this.empresas[0];
          this.actualizarImagenEmpresa(this.empresas[0]);
          localStorage.setItem('selectedEmpresaId', String(this.empresas[0].id));
          console.log('Empresa seleccionada:', this.selectedEmpresaId);
        } else {
          this.selectedEmpresaId = null;
          this.actualizarImagenEmpresa(null);
          localStorage.removeItem('selectedEmpresaId');
          console.log('Empresa seleccionada:', this.selectedEmpresaId);
        }
        // Cargar clientes de la empresa seleccionada
        if (this.selectedEmpresaId?.id) {
          this.clienteService.getClientesByEmpresaId(this.selectedEmpresaId.id).subscribe({
            next: (clientes) => {
              console.log('Clientes recibidos para empresa:', clientes);
              this.clientes = clientes || [];
              this.updatePaginatedClientes();
              // Restaurar selección de cliente desde localStorage
              const storedCliente = localStorage.getItem('selectedCliente');
              if (storedCliente) {
                try {
                  const clienteObj = JSON.parse(storedCliente);
                  const cliente = this.clientes.find(c => c.id === clienteObj.id);
                  console.log('Intentando restaurar cliente seleccionado:', clienteObj);
                  if (cliente) {
                    this.clienteSeleccionado = cliente;
                    console.log('Cliente restaurado correctamente:', cliente);
                  } else {
                    this.clienteSeleccionado = null;
                    console.log('No se encontró el cliente en la lista actual.');
                  }
                } catch (e) {
                  this.clienteSeleccionado = null;
                  console.error('Error restaurando cliente seleccionado:', e);
                }
              } else {
                console.log('No hay cliente guardado en localStorage.');
              }
              // Cargar tareas del cliente seleccionado, si existe
              if (this.clienteSeleccionado?.id) {
                this.userTareaService.getTareasByClienteId(this.clienteSeleccionado.id).subscribe({
                  next: (tareas) => {
                    console.log('Tareas recibidas para cliente:', tareas);
                    this.tareasAgregadas = tareas || [];
                    this.mostrarTabla = this.tareasAgregadas.length > 0;
                    localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
                  },
                  error: (error) => {
                    console.error('Error al cargar tareas:', error);
                    this.toastr.error(error.message || 'Error al cargar las tareas');
                    this.tareasAgregadas = [];
                    this.mostrarTabla = false;
                  }
                });
              }
              // Imprimir estado final en consola
              console.log('Estado final clienteSeleccionado:', this.clienteSeleccionado);
            },
            error: (error) => {
              console.error('Error al cargar clientes por empresa:', error);
             // this.toastr.error(error.message || 'Error al cargar los clientes');
              this.clientes = [];
              this.updatePaginatedClientes();
            }
          });
        }
      },
      error: (error) => {
        //this.toastr.error(error.message || 'Error al cargar las empresas');
        console.error('[EMPRESA] Error al cargar empresas:', error);
      }
    });
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
      this.toastr.error('Error al abrir la lista de empresas');
      return;
    }
    const listaEmpresasModalInstance = bootstrap.Modal.getInstance(listaEmpresasModalEl) || new bootstrap.Modal(listaEmpresasModalEl);
    listaEmpresasModalInstance.show();
  }

  updatePaginatedEmpresas(): void {
    const startIndex = (this.currentEmpresaPage - 1) * this.itemsPerPageEmpresas;
    const endIndex = startIndex + this.itemsPerPageEmpresas;
    this.paginatedEmpresas = this.empresas.slice(startIndex, endIndex);
    this.totalEmpresaPages = Math.ceil(this.empresas.length / this.itemsPerPageEmpresas) || 1;
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
    console.log('[EMPRESA] Solicitar confirmación para eliminar empresa con id:', id);
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¿Deseas eliminar esta empresa? Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        console.log('[EMPRESA] Eliminando empresa con id:', id);
        this.empresaService.deleteEmpresa(id).subscribe({
          next: () => {
            this.toastr.success('Empresa eliminada correctamente', 'Éxito');
            this.empresas = this.empresas.filter(empresa => empresa.id !== id);
            this.updatePaginatedEmpresas();
            console.log('[EMPRESA] Empresa eliminada correctamente:', id);
          },
          error: (error) => {
            this.toastr.error(error.message || 'Error al eliminar la empresa', 'Error');
            console.error('[EMPRESA] Error al eliminar empresa:', error);
          }
        });
      } else {
        console.log('[EMPRESA] Eliminación cancelada por el usuario');
      }
    });
  }

  // ...el método editarEmpresa ahora redirige al componente de edición




  deleteCliente(id: number): void {
    this.clienteService.deleteCliente(id).subscribe({
      next: () => {
        this.toastr.success('Cliente eliminado correctamente', 'Éxito');
        // Actualizar la lista de clientes
        this.clientes = this.clientes.filter(cliente => cliente.id !== id);
        // Ajustar la página actual si es necesario
        if (this.paginatedClientes.length === 1 && this.currentPage > 1) {
          this.currentPage--;
        }
        this.updatePaginatedClientes();
      },
      error: (error) => {
        console.error('Error al eliminar cliente:', error);
        this.toastr.error(error.message || 'Error al eliminar el cliente', 'Error');
      }
    });
  }

  solicitarConfirmacionEliminar(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¿Deseas eliminar este cliente? Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.clienteService.deleteCliente(id).subscribe({
          next: () => {
            this.toastr.success('Cliente eliminado correctamente', 'Éxito');
            this.clientes = this.clientes.filter(cliente => cliente.id !== id);
            if (this.paginatedClientes.length === 1 && this.currentPage > 1) {
              this.currentPage--;
            }
            this.updatePaginatedClientes();
          },
          error: (error) => {
            console.error('Error al eliminar cliente:', error);
            this.toastr.error(error.message || 'Error al eliminar el cliente', 'Error');
          }
        });
      }
    });
  }

  cancelarEliminarCliente(): void {
    this.mostrarModalConfirmacion = false;
    this.clienteAEliminar = null;
  }

  updatePaginatedClientes(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedClientes = this.clientes.slice(startIndex, endIndex);
    this.totalPages = Math.ceil(this.clientes.length / this.itemsPerPage) || 1;
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



/*
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
    const modals = ['exampleModal', 'imageModal', 'clientModal', 'miModal'];
    modals.forEach(modalId => {
      const modalElement = document.getElementById(modalId);
      if (modalElement) {
        modalElement.addEventListener('show.bs.modal', () => {
          const backdrops = document.querySelectorAll('.modal-backdrop');
          backdrops.forEach(backdrop => backdrop.remove());
        });
        modalElement.addEventListener('hidden.bs.modal', () => {
          const triggerButton = document.querySelector(`[data-bs-target="#${modalId}"]`) as HTMLElement;
          if (triggerButton) triggerButton.focus();
          const backdrops = document.querySelectorAll('.modal-backdrop');
          backdrops.forEach(backdrop => backdrop.remove());
        });
      }
    });

    // Lógica para reabrir el modal de empresa al cerrar el de imagen, evitando bucles
    const imageModal = document.getElementById('imageModal');
    if (imageModal) {
      imageModal.addEventListener('hidden.bs.modal', () => {
        // Solo reabrir si el modal de empresa no está abierto y el flag está activo
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
      });
    }
  }*/






ngAfterViewInit0() {
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
      const modals = ['exampleModal','listaEmpresasModal' ,'imageModal', 'clientModal', 'listaClientesModal', 'miModal', 'provinciaModal'];
    modals.forEach(modalId => {
      const modalElement = document.getElementById(modalId);
      if (modalElement) {
        modalElement.addEventListener('show.bs.modal', () => {
          // Limpiar backdrops solo si hay más de uno para evitar conflictos
          const backdrops = document.querySelectorAll('.modal-backdrop');
          if (backdrops.length > 1) {
            backdrops.forEach((backdrop, index) => {
              if (index < backdrops.length - 1) backdrop.remove();
            });
          }
        });
        modalElement.addEventListener('hidden.bs.modal', () => {
          const triggerButton = document.querySelector(`[data-bs-target="#${modalId}"]`) as HTMLElement;
          if (triggerButton) triggerButton.focus();
          // Limpiar backdrops solo si hay más de uno
          const backdrops = document.querySelectorAll('.modal-backdrop');
          if (backdrops.length > 1) {
            backdrops.forEach((backdrop, index) => {
              if (index < backdrops.length - 1) backdrop.remove();
            });
          }
        });
      }
    });

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
      });
    }

    // Lógica para reabrir clientModal al cerrar listaClientesModal (comentada para evitar apertura automática)
    /*
    const listaClientesModal = document.getElementById('listaClientesModal');
    if (listaClientesModal) {
      listaClientesModal.addEventListener('hidden.bs.modal', () => {
        const clientModal = document.getElementById('clientModal');
        if (clientModal && !clientModal.classList.contains('show')) {
          setTimeout(() => {
            const modal = new bootstrap.Modal(clientModal);
            modal.show();
          }, 300);
        }
      });
    }
    */
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
        });
      }
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
  const modals = ['exampleModal', 'listaEmpresasModal', 'imageModal', 'clientModal', 'listaClientesModal', 'miModal', 'provinciaModal'];
  modals.forEach(modalId => {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      modalElement.addEventListener('show.bs.modal', () => {
        // Limpiar backdrops solo si hay más de uno para evitar conflictos
        const backdrops = document.querySelectorAll('.modal-backdrop');
        if (backdrops.length > 1) {
          backdrops.forEach((backdrop, index) => {
            if (index < backdrops.length - 1) backdrop.remove();
          });
        }
      });
      modalElement.addEventListener('hidden.bs.modal', () => {
        const triggerButton = document.querySelector(`[data-bs-target="#${modalId}"]`) as HTMLElement;
        if (triggerButton) triggerButton.focus();
        // Limpiar backdrops solo si hay más de uno
        const backdrops = document.querySelectorAll('.modal-backdrop');
        if (backdrops.length > 1) {
          backdrops.forEach((backdrop, index) => {
            if (index < backdrops.length - 1) backdrop.remove();
          });
        }
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
}


obtenerTareas(): void {
  if (this.userData?.pais) {
    this.tareaService.getTareasByPais(this.userData.pais).subscribe({
      next: (tareas) => {
        this.tareas = tareas;
        this.tareasFiltradas = tareas;
        console.log('Tareas cargadas:', this.tareas);
      },
      error: () => this.toastr.error('Error al obtener las tareas', 'Error')
    });
  }
}






loadTareasAgregadas0(): void {
  // Cargar desde localStorage como respaldo inicial
  const storedTareas = localStorage.getItem('tareasAgregadas');
  if (storedTareas) {
    this.tareasAgregadas = JSON.parse(storedTareas);
    this.mostrarTabla = this.tareasAgregadas.length > 0;
  }

  // Sincronizar con el backend
  if (this.userCode) {
    this.userTareaService.getTareasByUserCode(this.userCode).subscribe({
      next: (tareas) => {
        this.tareasAgregadas = tareas;
        this.mostrarTabla = tareas.length > 0;
        localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas)); // Actualizar localStorage
        console.log('Tareas agregadas cargadas del backend:', this.tareasAgregadas);
      },
      error: () => {
        this.toastr.error('Error al cargar las tareas agregadas del backend', 'Error');
        console.log('Usando tareas de localStorage como respaldo:', this.tareasAgregadas);
      }
    });
  }
}


loadTareasAgregadas(): void {
    // Cargar desde localStorage como respaldo inicial
    const storedTareas = localStorage.getItem('tareasAgregadas');
    if (storedTareas) {
      this.tareasAgregadas = JSON.parse(storedTareas);
      this.mostrarTabla = this.tareasAgregadas.length > 0;
    }

    // Sincronizar con el backend
    if (this.clienteSeleccionado?.id) {
      this.userTareaService.getTareasByClienteId(this.clienteSeleccionado.id).subscribe({
        next: (tareas) => {
          this.tareasAgregadas = tareas;
          this.mostrarTabla = tareas.length > 0;
          localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
          console.log('Tareas agregadas cargadas del backend:', this.tareasAgregadas);
        },
        error: () => {
          this.toastr.error('Error al cargar las tareas agregadas del backend', 'Error');
          console.log('Usando tareas de localStorage como respaldo:', this.tareasAgregadas);
        }
      });
    }
  }



    seleccionar0(tarea: Tarea): void {
  if (!this.clienteSeleccionado) {
    Swal.fire({
      icon: 'warning',
      title: 'Falta selección',
      text: 'Debe seleccionar un cliente.',
      confirmButtonText: 'Aceptar',
      customClass: {
        popup: 'swal2-border-radius',
        confirmButton: 'btn btn-primary'
      }
    });
    return;
  }
  this.tareaSeleccionada = { ...tarea, descripcion: '', totalCost: this.calcularTotalCosto(tarea) };
  console.log('Tarea seleccionada:', this.tareaSeleccionada);
  this.abrirModal();
  }

  seleccionar(tarea: Tarea): void {
  // Verificar si hay empresa seleccionada
  if (!this.selectedEmpresaId) {
    Swal.fire({
      icon: 'warning',
      title: 'Falta selección de empresa',
      text: 'Debe seleccionar una empresa primero.',
      confirmButtonText: 'Aceptar',
      customClass: {
        popup: 'swal2-border-radius',
        confirmButton: 'btn btn-primary'
      }
    });
    return;
  }

  // Verificar si la empresa tiene clientes
  if (!this.clientes || this.clientes.length === 0) {
    Swal.fire({
      icon: 'info',
      title: 'Sin clientes',
      text: 'La empresa seleccionada no tiene clientes registrados. Por favor, agregue clientes primero.',
      confirmButtonText: 'Aceptar',
      customClass: {
        popup: 'swal2-border-radius',
        confirmButton: 'btn btn-primary'
      }
    });
    return;
  }

  // Verificar si hay cliente seleccionado
  if (!this.clienteSeleccionado) {
    Swal.fire({
      icon: 'warning',
      title: 'Falta selección',
      text: 'Debe seleccionar un cliente.',
      confirmButtonText: 'Aceptar',
      customClass: {
        popup: 'swal2-border-radius',
        confirmButton: 'btn btn-primary'
      }
    });
    return;
  }

  this.tareaSeleccionada = {
    ...tarea,
    descripcion: '',
    totalCost: this.calcularTotalCosto(tarea)
  };
  console.log('Tarea seleccionada:', this.tareaSeleccionada);
  this.abrirModal();
}





    abrirModal(): void {
      const modal = new bootstrap.Modal(document.getElementById('miModal') as HTMLElement);
      modal.show();
    }






/*
actualizarTarea(): void {
  if (this.tareaSeleccionada?.id) {
    const updatedTarea: UserTarea = {
      ...this.tareaSeleccionada,
      userCode: this.userCode,
      pais: this.userData.pais,
      rubro: this.tareaSeleccionada.rubro || '',
      categoria: this.tareaSeleccionada.categoria || '',
      totalCost: this.calcularTotalCosto(this.tareaSeleccionada)
    };
    this.userTareaService.updateUserTarea(this.tareaSeleccionada.id, updatedTarea).subscribe({
      next: () => {
        this.toastr.success('Tarea actualizada', 'Éxito');
        this.loadTareasAgregadas(); // Recargar desde backend y actualizar localStorage y servicio
        this.resetTareaSeleccionada();
      },
      error: () => {
        const index = this.tareasAgregadas.findIndex(t => t.id === this.tareaSeleccionada.id);
        if (index !== -1) {
          this.tareasAgregadas[index] = updatedTarea; // Actualizar localmente
          localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
          this.presupuestoService.setTareasAgregadas(this.tareasAgregadas); // Actualizar en el servicio
          this.toastr.error('Error al actualizar la tarea en el backend, actualizada localmente', 'Error');
        }
        this.resetTareaSeleccionada();
      }
    });
  }
}*/

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
        next: () => {
          this.toastr.success('Tarea actualizada', 'Éxito');
          this.loadTareasAgregadas();
          this.resetTareaSeleccionada();
        },
        error: () => {
          const index = this.tareasAgregadas.findIndex(t => t.id === this.tareaSeleccionada.id);
          if (index !== -1) {
            this.tareasAgregadas[index] = updatedTarea;
            localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
            this.presupuestoService.setTareasAgregadas(this.tareasAgregadas);
            this.toastr.error('Error al actualizar la tarea en el backend, actualizada localmente', 'Error');
          }
          this.resetTareaSeleccionada();
        }
      });
    }
  }



/*
agregarTarea0(): void {
  const nuevaTarea: UserTarea = {
    ...this.tareaSeleccionada,
    userCode: this.userCode,
    pais: this.userData.pais,
    rubro: this.tareaSeleccionada.rubro || '',
    categoria: this.tareaSeleccionada.categoria || '',
    totalCost: this.calcularTotalCosto(this.tareaSeleccionada)
  };
  this.userTareaService.addUserTarea(nuevaTarea).subscribe({
    next: (tarea) => {
      this.tareasAgregadas.push(tarea);
      this.mostrarTabla = true;
      localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
      this.presupuestoService.setTareasAgregadas(this.tareasAgregadas); // Guardar en localStorage
      this.toastr.success('Tarea agregada', 'Éxito');
      this.resetTareaSeleccionada();
    },
    error: () => {
      this.tareasAgregadas.push(nuevaTarea); // Guardar en localStorage como respaldo
      this.mostrarTabla = true;
      localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
      this.presupuestoService.setTareasAgregadas(this.tareasAgregadas);
      this.toastr.error('Error al agregar la tarea al backend, guardada localmente', 'Error');
      this.resetTareaSeleccionada();
    }
  });
}*/

agregarTarea1(): void {
    const nuevaTarea: UserTarea = {
      ...this.tareaSeleccionada,
  clienteId: this.clienteSeleccionado?.id ?? 0, // Usa clienteId seguro
      pais: this.userData.pais,
      rubro: this.tareaSeleccionada.rubro || '',
      categoria: this.tareaSeleccionada.categoria || '',
      totalCost: this.calcularTotalCosto(this.tareaSeleccionada)
    };
    this.userTareaService.addUserTarea(nuevaTarea).subscribe({
      next: (tarea) => {
        this.tareasAgregadas.push(tarea);
        this.mostrarTabla = true;
        localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
        this.presupuestoService.setTareasAgregadas(this.tareasAgregadas);
        this.toastr.success('Tarea agregada', 'Éxito');
        this.resetTareaSeleccionada();
      },
      error: () => {
        this.tareasAgregadas.push(nuevaTarea);
        this.mostrarTabla = true;
        localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
        this.presupuestoService.setTareasAgregadas(this.tareasAgregadas);
        this.toastr.error('Error al agregar la tarea al backend, guardada localmente', 'Error');
        this.resetTareaSeleccionada();
      }
    });
  }


agregarTarea(): void {
    const clienteId = this.clienteSeleccionado?.id ?? null;
    const nuevaTarea: UserTarea = {
      ...this.tareaSeleccionada,
      clienteId: clienteId ?? 0,
      pais: this.userData.pais,
      rubro: this.tareaSeleccionada.rubro || '',
      categoria: this.tareaSeleccionada.categoria || '',
      totalCost: this.calcularTotalCosto(this.tareaSeleccionada)
    };

    const guardarLocal = (mensaje?: string) => {
      this.tareasAgregadas.push(nuevaTarea);
      this.mostrarTabla = true;
      localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
      this.presupuestoService.setTareasAgregadas(this.tareasAgregadas);
      if (mensaje) {
        this.toastr.info(mensaje, 'Informacion');
      }
      this.resetTareaSeleccionada();
    };

    if (!clienteId) {
      guardarLocal('Tarea agregada localmente. Podras asociarla a un cliente mas adelante.');
      return;
    }

    this.userTareaService.addUserTarea(nuevaTarea).subscribe({
      next: (tarea) => {
        this.tareasAgregadas.push(tarea);
        this.mostrarTabla = true;
        localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
        this.presupuestoService.setTareasAgregadas(this.tareasAgregadas);
        this.toastr.success('Tarea agregada', 'Exito');
        this.resetTareaSeleccionada();
      },
      error: (error) => {
        console.error('Error al agregar tarea:', error.message, nuevaTarea);
        guardarLocal(error.message || 'Error al sincronizar con el backend, tarea guardada localmente');
      }
    });
  }


  verPresupuesto(): void {
  // Validar selección de empresa y cliente
  let mensaje = '';
  if (!this.selectedEmpresaId && !this.clienteSeleccionado) {
    mensaje = 'Debe seleccionar una empresa y un cliente.';
  } else if (!this.selectedEmpresaId) {
    mensaje = 'Debe seleccionar una empresa.';
  } else if (!this.clienteSeleccionado) {
    mensaje = 'Debe seleccionar un cliente.';
  }
  if (mensaje) {
    Swal.fire({
      icon: 'warning',
      title: 'Falta selección',
      text: mensaje,
      confirmButtonText: 'Aceptar',
      customClass: {
        popup: 'swal2-border-radius',
        confirmButton: 'btn btn-primary'
      }
    });
    return;
  }
  // Guardar datos seleccionados en localStorage para transferirlos
  localStorage.setItem('selectedCliente', JSON.stringify(this.clienteSeleccionado));
  localStorage.setItem('selectedEmpresa', JSON.stringify(this.selectedEmpresaId));
  localStorage.setItem('selectedTareas', JSON.stringify(this.tareasAgregadas));
  this.route.navigate(['/presupuesto']);
}

onCargarPresupuestoGuardado1(presupuesto: SavedPresupuesto): void {
  this.tareasAgregadas = (presupuesto.tareas || []).map(t => ({ ...t }));
  this.mostrarTabla = this.tareasAgregadas.length > 0;
  localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
  this.presupuestoService.setTareasAgregadas(this.tareasAgregadas);

  if (presupuesto.cliente) {
    const cliente = presupuesto.cliente.id
      ? this.clientes.find(c => c.id === presupuesto.cliente?.id) || presupuesto.cliente
      : presupuesto.cliente;
    this.clienteSeleccionado = cliente;
    localStorage.setItem('selectedCliente', JSON.stringify(cliente));
  } else {
    this.clienteSeleccionado = null;
    localStorage.removeItem('selectedCliente');
  }

  if (presupuesto.empresa) {
    const empresa = presupuesto.empresa.id
      ? this.empresas.find(e => e.id === presupuesto.empresa?.id) || presupuesto.empresa
      : presupuesto.empresa;
    this.selectedEmpresaId = empresa;
    this.empresaName = empresa?.name || '';
    this.empresaPhone = empresa?.phone || '';
    this.empresaEmail = empresa?.email || '';
    this.additionalDetailsEmpresa = empresa?.description || '';
    this.empresaWebsite = empresa?.website || '';
    this.empresaTikTok = empresa?.tiktok || '';
    this.empresaInstagram = empresa?.instagram || '';
    this.empresaFacebook = empresa?.facebook || '';
    this.empresaCuilCuit = empresa?.cuilCuit || '';
    if (empresa?.id) {
      localStorage.setItem('selectedEmpresaId', String(empresa.id));
    }
    this.actualizarImagenEmpresa(empresa);
  } else {
    this.selectedEmpresaId = null;
    localStorage.removeItem('selectedEmpresaId');
    this.actualizarImagenEmpresa(null);
  }

  this.toastr.success('Presupuesto cargado correctamente', presupuesto.name);
}

onCargarPresupuestoGuardado0(presupuesto: SavedPresupuesto): void {
  console.log('Cargando presupuesto guardado:', presupuesto);

  // Cargar tareas
  this.tareasAgregadas = (presupuesto.tareas || []).map(t => ({ ...t }));
  this.mostrarTabla = this.tareasAgregadas.length > 0;
  localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
  this.presupuestoService.setTareasAgregadas(this.tareasAgregadas);

  // Cargar cliente
  if (presupuesto.cliente) {
    const cliente = this.clientes.find(c => c.id === presupuesto.cliente.id) || presupuesto.cliente;
    this.clienteSeleccionado = cliente;
    localStorage.setItem('selectedCliente', JSON.stringify(cliente));
  } else {
    this.clienteSeleccionado = null;
    localStorage.removeItem('selectedCliente');
  }

  // ELIMINA TODO ESTE BLOQUE (empresa ya no existe en el presupuesto)
  // if (presupuesto.empresa) { ... }

  this.toastr.success('Presupuesto cargado correctamente', presupuesto.name);
}

onCargarPresupuestoGuardado(presupuesto: SavedPresupuesto): void {
  console.log('%cCARGANDO PRESUPUESTO GUARDADO', 'color: #4CAF50; font-weight: bold; font-size: 14px');
  console.log('Presupuesto recibido:', {
    id: presupuesto.id,
    name: presupuesto.name,
    cliente: presupuesto.cliente?.name || 'Sin cliente',
    tareasCount: presupuesto.tareas?.length || 0
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

  console.log('Tareas cargadas:', this.tareasAgregadas.length, 'tareas');

  // 2. CARGAR CLIENTE DEL PRESUPUESTO
  if (presupuesto.cliente && presupuesto.cliente.id) {
    // Buscar si el cliente ya está en la lista cargada
    const clienteEncontrado = this.clientes.find(c => c.id === presupuesto.cliente.id);

    if (clienteEncontrado) {
      this.clienteSeleccionado = clienteEncontrado;
      console.log('Cliente encontrado en lista local:', clienteEncontrado.name);
    } else {
      // Si no está en la lista local, usar el que viene del backend
      this.clienteSeleccionado = presupuesto.cliente;
      console.log('Cliente cargado desde presupuesto:', this.clienteSeleccionado.name);
    }

    // Guardar en localStorage
    localStorage.setItem('selectedCliente', JSON.stringify(this.clienteSeleccionado));
  } else {
    this.clienteSeleccionado = null;
    localStorage.removeItem('selectedCliente');
    console.warn('El presupuesto no tiene cliente asociado');
  }

  // 3. NO TOCAR LA EMPRESA
  // La empresa actual ya está seleccionada por el usuario.
  // No la cambiamos al cargar un presupuesto (sería confuso para el usuario).
  console.log('Empresa actual mantenida:', this.selectedEmpresa?.name || 'Ninguna');

  // 4. FEEDBACK AL USUARIO
  this.toastr.success(
    `Presupuesto "${presupuesto.name}" cargado correctamente`,
    '¡Listo!',
    { timeOut: 3000 }
  );

  // 5. SCROLL SUAVE A LA TABLA (opcional, mejora UX)
  setTimeout(() => {
    const tabla = document.querySelector('.table-responsive');
    if (tabla) {
      tabla.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
}



toggleSavedBudgetsPanel(): void {
  this.showSavedBudgetsPanel = !this.showSavedBudgetsPanel;
}

closeSavedBudgetsPanel(): void {
  this.showSavedBudgetsPanel = false;
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





        eliminarTarea0(index: number): void {
    if (index >= 0 && index < this.tareasAgregadas.length) {
      this.tareasAgregadas.splice(index, 1);
      this.mostrarTabla = this.tareasAgregadas.length > 0;
    }
  }

  eliminarTarea1(id: number): void {
  this.userTareaService.deleteUserTarea(id).subscribe({
    next: () => {
      this.tareasAgregadas = this.tareasAgregadas.filter(tarea => tarea.id !== id);
      this.mostrarTabla = this.tareasAgregadas.length > 0;
      this.toastr.success('Tarea eliminada', 'Éxito');
    },
    error: () => this.toastr.error('Error al eliminar la tarea', 'Error')
  });
}

eliminarTarea00(id: number): void {
  this.userTareaService.deleteUserTarea(id).subscribe({
    next: () => {
      this.tareasAgregadas = this.tareasAgregadas.filter(tarea => tarea.id !== id);
      this.mostrarTabla = this.tareasAgregadas.length > 0;
      localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas)); // Actualizar localStorage
      this.toastr.success('Tarea eliminada', 'Éxito');
    },
    error: () => {
      this.tareasAgregadas = this.tareasAgregadas.filter(tarea => tarea.id !== id); // Eliminar localmente
      this.mostrarTabla = this.tareasAgregadas.length > 0;
      localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
      this.toastr.error('Error al eliminar la tarea del backend, eliminada localmente', 'Error');
    }
  });
}

eliminarTarea(id: number): void {
  this.userTareaService.deleteUserTarea(id).subscribe({
    next: () => {
      // Éxito: tarea eliminada del backend
      this.tareasAgregadas = this.tareasAgregadas.filter(t => t.id !== id);
      this.actualizarTablaYStorage();
      this.toastr.success('Tarea eliminada correctamente', 'Éxito');
    },
    error: (err) => {
      const errorMessage = err.error?.error || err.message || 'Error desconocido';

      // Caso específico: tarea asociada a presupuestos
      if (errorMessage.includes('asociada') || errorMessage.includes('referenced') || errorMessage.includes('presupuesto')) {
        this.toastr.warning(
          'No se puede eliminar esta tarea porque está incluida en uno o más presupuestos guardados.\n' +
          'Si quieres borrarla permanentemente, elimina primero los presupuestos que la contienen.',
          'Tarea en uso',
          { timeOut: 8000, closeButton: true }
        );
      } else {
        this.toastr.error('Error al eliminar la tarea del servidor', 'Error');
      }

      // En ambos casos, eliminar localmente para mantener consistencia visual
      //this.tareasAgregadas = this.tareasAgregadas.filter(t => t.id !== id);
      this.actualizarTablaYStorage();
    }
  });
}

// Método auxiliar para evitar repetir código
private actualizarTablaYStorage() {
  this.mostrarTabla = this.tareasAgregadas.length > 0;
  localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
}





      calcularTotalCosto0(tarea: Tarea): number {
        return (tarea.area || 0) * (tarea.costo || 0) * (1 - (tarea.descuento || 0) / 100);
      }

      calcularCostoTotal0(): number {
        return this.tareasAgregadas
        .reduce((total, tarea) =>
          total + (tarea.totalCost || 0),
         0);
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
    this.authService.logout();
    this.route.navigate(['']);
    this.toastr.success('Logout exitoso', 'Éxito');
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



    uploadImage0(): void {
    const fileInput = this.imageInput?.nativeElement as HTMLInputElement;
    if (!fileInput) {
      console.error('Error: Elemento de entrada de imagen no encontrado.');
      this.toastr.error('Error: No se encontró el campo de imagen.');
      return;
    }
    const file = fileInput.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const imageBase64 = e.target.result;
        localStorage.setItem('uploadedImage', imageBase64);
        const modalPreview = this.modalImagePreview?.nativeElement as HTMLImageElement;
        if (modalPreview) {
          modalPreview.src = imageBase64;
          modalPreview.style.display = 'block';
        }
        const mainPreview = document.getElementById('fixedImageIcon') as HTMLImageElement;
        const mainPreview2 = document.getElementById('fixedImageIconmodal') as HTMLImageElement;
        if (mainPreview) {
          mainPreview.src = imageBase64;
          mainPreview.style.display = 'block';
        }
        if (mainPreview2) {
          mainPreview2.src = imageBase64;
          mainPreview2.style.display = 'block';
        }
        this.uploadMessage.nativeElement.style.display = 'block';
        console.log('Imagen subida con éxito.');
        this.toastr.success('Imagen subida con éxito.');
      };
      reader.readAsDataURL(file);
    } else {
      console.error('Error: No se seleccionó ninguna imagen.');
      this.toastr.error('Por favor, selecciona una imagen.');
    }
  }



uploadImage1(): void {
  const fileInput = this.imageInput?.nativeElement as HTMLInputElement;
  if (!fileInput) {
    this.toastr.error('Error: No se encontró el campo de imagen.');
    return;
  }
  const file = fileInput.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const imageBase64 = e.target.result;
      localStorage.setItem('uploadedImage', imageBase64);
      const modalPreview = this.modalImagePreview?.nativeElement as HTMLImageElement;
      if (modalPreview) {
        modalPreview.src = imageBase64;
        modalPreview.style.display = 'block';
      }
      const mainPreview = document.getElementById('fixedImageIcon') as HTMLImageElement;
      const mainPreview2 = document.getElementById('fixedImageIconmodal') as HTMLImageElement;
      if (mainPreview) {
        mainPreview.src = imageBase64;
        mainPreview.style.display = 'block';
      }
      if (mainPreview2) {
        mainPreview2.src = imageBase64;
        mainPreview2.style.display = 'block';
      }
      this.uploadMessage.nativeElement.style.display = 'block';
      this.toastr.success('Imagen subida con éxito.');
      console.log('Imagen subida con éxito.');
    };
    reader.readAsDataURL(file);
  } else {
    this.toastr.error('Por favor, selecciona una imagen.');
    console.error('Error: No se seleccionó ninguna imagen.');
  }
}

 uploadImage(): void {
    const fileInput = this.imageInput?.nativeElement as HTMLInputElement;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      this.toastr.error('Por favor, selecciona una imagen.');
      return;
    }

    const file = fileInput.files[0];
    this.empresaService.uploadImage(file, this.userCode).subscribe({
      next: (url) => {
        this.logoUrl = url; // Almacena la URL retornada por el backend
        const modalPreview = this.modalImagePreview?.nativeElement as HTMLImageElement;
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
        this.toastr.success('Imagen subida con éxito.');
      },
      error: (err) => {
        this.toastr.error(`Error al subir la imagen: ${err.message}`);
      }
    });
  }



onImageChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.imageSelected = !!(target.files && target.files[0]);
  }








saveFormData0() {
  const formData = {
    name: this.empresaName,
    phone: this.empresaPhone,
    email: this.empresaEmail,
    description: this.additionalDetailsEmpresa,
    website: this.empresaWebsite,
    tiktok: this.empresaTikTok,
    instagram: this.empresaInstagram,
    facebook: this.empresaFacebook,
    cuilCuit: this.empresaCuilCuit,
    logoUrl: localStorage.getItem('uploadedImage') || '',
    userCode: this.userCode
  };
  this.empresaService.saveEmpresa(formData).subscribe({
    next: (empresa) => {
      this.toastr.success('Datos de la empresa guardados', 'Éxito');
    },
    error: () => this.toastr.error('Error al guardar los datos de la empresa', 'Error')
  });
}

  saveFormData(): void {
    console.log('[EMPRESA] Guardar datos de empresa. Modo edición:', this.empresaEditId !== null);
    if (!this.empresaName.trim()) {
      this.toastr.error('El nombre de la empresa es obligatorio.');
      console.error('[EMPRESA] El nombre de la empresa es obligatorio.');
      return;
    }
    if (!this.userCode.trim()) {
      this.toastr.error('El código de usuario es obligatorio.');
      console.error('[EMPRESA] El código de usuario es obligatorio.');
      return;
    }
    if (!this.logoUrl) {
      this.toastr.error('Por favor, sube una imagen para la empresa.');
      console.error('[EMPRESA] Falta logoUrl.');
      return;
    }

    const formData: Empresa = {
      name: this.empresaName,
      phone: this.empresaPhone,
      email: this.empresaEmail,
      description: this.additionalDetailsEmpresa,
      logoUrl: this.logoUrl,
      userCode: this.userCode,
      website: this.empresaWebsite,
      tiktok: this.empresaTikTok,
      instagram: this.empresaInstagram,
      facebook: this.empresaFacebook,
      cuilCuit: this.empresaCuilCuit
    };
    console.log('[EMPRESA] Datos a enviar:', formData);

    if (this.empresaEditId !== null) {
      // Modo edición: actualizar empresa existente
      console.log('[EMPRESA] Llamando updateEmpresa con id:', this.empresaEditId);
      this.empresaService.updateEmpresa(this.empresaEditId, formData).subscribe({
        next: (empresa) => {
          this.toastr.success('Empresa actualizada correctamente', 'Éxito');
          console.log('[EMPRESA] Empresa actualizada correctamente:', empresa);
          this.getEmpresasByUserCode();
          this.limpiarEmpresaForm();
        },
        error: (err) => {
          this.toastr.error(`Error al actualizar la empresa: ${err.message}`);
          console.error('[EMPRESA] Error al actualizar empresa:', err);
        }
      });
    } else {
      // Modo creación: crear nueva empresa
      console.log('[EMPRESA] Llamando saveEmpresa');
      this.empresaService.saveEmpresa(formData).subscribe({
        next: (empresa) => {
          this.toastr.success('Datos de la empresa guardados', 'Éxito');
          console.log('[EMPRESA] Empresa creada correctamente:', empresa);
          this.getEmpresasByUserCode();
          this.limpiarEmpresaForm();
        },
        error: (err) => {
          this.toastr.error(`Error al guardar la empresa: ${err.message}`);
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
    console.log('budgetDate cambiado:', this.budgetDate);
  }

  /*

  saveClientData0(form: NgForm): void {
    console.log('Valores antes de enviar:', {
      clientName: this.clientName,
      clientContact: this.clientContact,
      budgetDate: this.budgetDate,
      additionalDetailsClient: this.additionalDetailsClient,
      userCode: this.userCode
    });

    if (!this.validateForm(form)) {
      return;
    }

    const clientData: Cliente = {
      name: this.clientName,
      contact: this.clientContact,
      budgetDate: this.budgetDate,
      additionalDetails: this.additionalDetailsClient,
      userCode: this.userCode
    };

    this.clienteService.saveCliente(clientData).subscribe({
      next: (cliente) => {
        localStorage.setItem(`clientData_${cliente.id || Date.now()}`, JSON.stringify(cliente));
        console.log('Cliente guardado con éxito:', cliente);
        this.toastr.success('Cliente guardado con éxito');
        this.clientName = '';
        this.clientContact = '';
        this.budgetDate = new Date().toISOString().split('T')[0]; // Reset a fecha actual
        this.additionalDetailsClient = '';
        const confirmationMessage = document.getElementById('confirmationMessage');
        if (confirmationMessage) {
          confirmationMessage.style.display = 'block';
          setTimeout(() => confirmationMessage.style.display = 'none', 3000);
        }
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('clientModal'));
        modal?.hide();
      },
      error: (error) => {
        localStorage.setItem(`clientData_temp_${Date.now()}`, JSON.stringify(clientData));
        console.error('Error al guardar cliente:', error.message, clientData);
        this.toastr.error(error.message || 'Error al guardar el cliente');
      }
    });
  }*/


    /*

    saveClientData(form: NgForm): void {
    console.log('Valores antes de enviar:', {
      clientName: this.clientName,
      clientContact: this.clientContact,
      budgetDate: this.budgetDate,
      additionalDetailsClient: this.additionalDetailsClient,
      clientEmail: this.clientEmail,
      clientClave: this.clientClave,
      clientDireccion: this.clientDireccion,
      userCode: this.userCode
    });

    if (!this.validateForm(form)) {
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


    };

    this.isSavingClient = true;
    this.clienteService.saveCliente(clientData).subscribe({
      next: (cliente) => {
        localStorage.setItem(`clientData_${cliente.id || Date.now()}`, JSON.stringify(cliente));
        console.log('Cliente guardado con éxito:', cliente);
        this.toastr.success('Cliente guardado con éxito');
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
      },
      error: (error) => {
        localStorage.setItem(`clientData_temp_${Date.now()}`, JSON.stringify(clientData));
        console.error('Error al guardar cliente:', error.message, clientData);
        this.toastr.error(error.message || 'Error al guardar el cliente');
        this.isSavingClient = false;
      }
    });
  }*/


saveClientData0(form: NgForm): void {
    console.log('Valores antes de enviar:', {
      clientName: this.clientName,
      clientContact: this.clientContact,
      budgetDate: this.budgetDate,
      additionalDetailsClient: this.additionalDetailsClient,
      clientEmail: this.clientEmail,
      clientClave: this.clientClave,
      clientDireccion: this.clientDireccion,
      userCode: this.userCode,
      empresaId: this.selectedEmpresaId?.id
    });

    if (!this.validateForm(form)) {
      return;
    }

    if (!this.selectedEmpresaId?.id) {
      this.toastr.error('Debe seleccionar una empresa', 'Error');
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
      empresaId: this.selectedEmpresaId.id // Captura empresaId de la empresa seleccionada
    };

    this.isSavingClient = true;
    this.clienteService.saveCliente(clientData).subscribe({
      next: (cliente) => {
        localStorage.setItem(`clientData_${cliente.id || Date.now()}`, JSON.stringify(cliente));
        console.log('Cliente guardado con éxito:', cliente);
        this.toastr.success('Cliente guardado con éxito');
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
      },
      error: (error) => {
        localStorage.setItem(`clientData_temp_${Date.now()}`, JSON.stringify(clientData));
        console.error('Error al guardar cliente:', error.message, clientData);
        this.toastr.error(error.message || 'Error al guardar el cliente');
        this.isSavingClient = false;
      }
    });
  }


  saveClientData(form: NgForm): void {
    console.log('Valores antes de enviar:', {
      clientName: this.clientName,
      clientContact: this.clientContact,
      budgetDate: this.budgetDate,
      additionalDetailsClient: this.additionalDetailsClient,
      clientEmail: this.clientEmail,
      clientClave: this.clientClave,
      clientDireccion: this.clientDireccion,
      userCode: this.userCode,
      empresaId: this.selectedEmpresaId?.id
    });

    if (!this.validateForm(form)) {
      return;
    }

    if (!this.selectedEmpresaId?.id) {
      this.toastr.error('Debe seleccionar una empresa', 'Error');
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

    this.isSavingClient = true;
    this.clienteService.saveCliente(clientData).subscribe({
      next: (cliente) => {
        localStorage.setItem(`clientData_${cliente.id || Date.now()}`, JSON.stringify(cliente));
        console.log('Cliente guardado con éxito:', cliente);
        this.toastr.success('Cliente guardado con éxito');
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
      },
      error: (error) => {
        localStorage.setItem(`clientData_temp_${Date.now()}`, JSON.stringify(clientData));
        console.error('Error al guardar cliente:', error.message, clientData);
        this.toastr.error(error.message || 'Error al guardar el cliente');
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
        this.toastr.error(nameCtrl?.errors?.['minlength'] ? 'El nombre debe tener al menos 2 caracteres' : 'El nombre es obligatorio');
      }
      if (!contactCtrl?.valid) {
        this.toastr.error(contactCtrl?.errors?.['pattern'] ? 'El contacto debe ser un número de teléfono válido (7-15 dígitos, puede incluir +)' : 'El contacto es obligatorio');
      }
      if (!dateCtrl?.valid || !this.budgetDate || this.budgetDate === '0000-00-00') {
        this.toastr.error('La fecha del presupuesto es obligatoria y debe ser válida');
      }
      if (!emailCtrl?.valid) {
        this.toastr.error(emailCtrl?.errors?.['email'] ? 'El email debe tener un formato válido' : 'El email es obligatorio');
      }
      if (!claveCtrl?.valid) {
        this.toastr.error(claveCtrl?.errors?.['pattern'] ? 'El CUIT debe tener el formato XX-XXXXXXXX-X' : 'El CUIT es obligatorio');
      }
      if (!direccionCtrl?.valid) {
        this.toastr.error(direccionCtrl?.errors?.['minlength'] ? 'La dirección debe tener al menos 5 caracteres' : 'La dirección es obligatoria');
      }
      console.error('Formulario inválido:', form.controls);
      return false;
    }
    if (!this.userCode || this.userCode.trim().length === 0) {
      this.toastr.error('El código de usuario es obligatorio');
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

  abrirModalImagen0(): void {
    const fileInput = this.imageInput?.nativeElement as HTMLInputElement;
    if (fileInput) {
      fileInput.click(); // Abre el selector de archivos
    }
  }



      mostrarAlerta(mensaje: string): void {
        this.toastr.success(mensaje);
      }




    disminuirPrecios(): void {
    const porcentaje = parseFloat(this.porcentajeBajar);
    if (isNaN(porcentaje) || porcentaje <= 0) {
      this.toastr.error('Por favor, ingrese un porcentaje válido para bajar', 'Error');
      return;
    }
    this.tareasFiltradas = this.tareasFiltradas.map(tarea => ({
      ...tarea,
      costo: tarea.costo * (1 - porcentaje / 100),
      totalCost: this.calcularTotalCosto({ ...tarea, costo: tarea.costo * (1 - porcentaje / 100) })
    }));
    this.toastr.success(`Lista reducida en ${porcentaje}%`, 'Éxito');
    this.porcentajeBajar = null;
  }

  ajustarPrecios(): void {
    const porcentaje = parseFloat(this.porcentajeSubir);
    if (isNaN(porcentaje) || porcentaje <= 0) {
      this.toastr.error('Por favor, ingrese un porcentaje válido para subir', 'Error');
      return;
    }
    this.tareasFiltradas = this.tareasFiltradas.map(tarea => ({
      ...tarea,
      costo: tarea.costo * (1 + porcentaje / 100),
      totalCost: this.calcularTotalCosto({ ...tarea, costo: tarea.costo * (1 + porcentaje / 100) })
    }));
    this.toastr.success(`Lista incrementada en ${porcentaje}%`, 'Éxito');
    this.porcentajeSubir = null;
  }



  loadUserCode(): void {
    this.userCode = localStorage.getItem('userCode') || '';
    const storedUserData = localStorage.getItem('userData');
    console.log('Datos en localStorage (userData):', storedUserData ? JSON.parse(storedUserData) : null); // Depuración
    if (this.userCode) {
      this.fetchUserData();
    } else {
      this.toastr.error('Código de usuario no encontrado en el localStorage', 'Error');
      this.route.navigate(['']); // Redirigir al login
    }
  }



getClientesByUserCode(): void {
    if (!this.userCode) {
      this.toastr.error('Código de usuario no encontrado', 'Error');
      return;
    }
    console.log('Iniciando carga de clientes para userCode:', this.userCode);
    this.clienteService.getClienteByUserCode(this.userCode).subscribe({
      next: (clientes) => {
        console.log('Respuesta del backend:', clientes);
        this.clientes = clientes || [];
          this.updatePaginatedClientes();
        console.log('Clientes asignados:', this.clientes);
      },
      error: (error) => {
        console.error('Error en getClientesByUserCode:', error);
        this.toastr.error(error.message || 'Error al cargar los clientes');
      }
    });
}





openListaClientesModal(): void {
    this.getClientesByUserCode();
    const modalElement = document.getElementById('listaClientesModal');
    if (!modalElement) {
      console.error('Modal listaClientesModal no encontrado en el DOM');
      this.toastr.error('Error al abrir la lista de clientes');
      return;
    }
    const listaModal = new bootstrap.Modal(modalElement);
    listaModal.show();
    console.log('Modal abierto');
}


fetchUserData(): void {
  this.authService.getUserCode(this.userCode).subscribe(
    response => {
      this.userData = response;
      localStorage.setItem('userData', JSON.stringify(this.userData));
      console.log('Datos del usuario logueado:', this.userData); // Imprimir datos
      if (this.userData.fechaVencimiento) {
      this.calculateRemainingTime(this.userData.fechaVencimiento);
    }
    this.loadProvincias();
    this.obtenerTareas();
    this.loadWeather();
  },
    error => {
      console.error('Error al obtener datos del usuario:', error);
      this.toastr.error('Error al obtener los datos del usuario', 'Error');
      this.route.navigate(['']); // Redirigir al login
    }
  );
}



  loadProvincias(): void {
    if (this.userData?.pais) {
      this.provinciaService.getProvinciasByPais(this.userData.pais).subscribe(
        provincias => {
          this.provincias = provincias;
          console.log('Provincias cargadas:', provincias); // Depuración
        },
        error => {
          this.toastr.error('Error al cargar las provincias', 'Error');
        }
      );
    } else {
      console.warn('No se pudo cargar provincias: userData.pais no está disponible', this.userData); // Depuración
    }
  }

  /*
   onEmpresaSeleccionada0(empresa: any) {
  console.log('Empresa seleccionada:', empresa);
  if (empresa && empresa.id) {
    localStorage.setItem('selectedEmpresaId', String(empresa.id));
  } else {
    localStorage.removeItem('selectedEmpresaId');
  }
  const imageElement = document.getElementById('fixedImageIcon') as HTMLImageElement;
  if (empresa && empresa.logoUrl && imageElement) {
    imageElement.src = empresa.logoUrl;
    imageElement.style.display = 'block';
  } else if (imageElement) {
    imageElement.src = '#';
    imageElement.style.display = 'none';
  }
}

onEmpresaSeleccionada1(empresa: any) {
    console.log('Empresa seleccionada:', empresa);
    this.selectedEmpresaId = empresa; // Actualiza selectedEmpresaId
    if (empresa && empresa.id) {
      localStorage.setItem('selectedEmpresaId', String(empresa.id));
    } else {
      this.selectedEmpresaId = null; // Limpia si no hay empresa válida
      localStorage.removeItem('selectedEmpresaId');
    }
    const imageElement = document.getElementById('fixedImageIcon') as HTMLImageElement;
    if (empresa && empresa.logoUrl && imageElement) {
      imageElement.src = empresa.logoUrl;
      imageElement.style.display = 'block';
    } else if (imageElement) {
      imageElement.src = '#';
      imageElement.style.display = 'none';
    }
  }
*/


  /*onEmpresaSeleccionada(empresa: any) {

    console.log('Empresa seleccionada:', empresa);
    this.selectedEmpresaId = empresa;
    if (empresa && empresa.id) {
      localStorage.setItem('selectedEmpresaId', String(empresa.id));
      // Cargar clientes asociados a la empresa seleccionada
      this.clienteService.getClientesByEmpresaId(empresa.id).subscribe({
        next: (clientes) => {
          console.log('Clientes recibidos para empresa:', clientes);
          this.clientes = clientes || [];
          this.updatePaginatedClientes();
        },
        error: (error) => {
          console.error('Error al cargar clientes por empresa:', error);
          this.toastr.error(error.message || 'Error al cargar los clientes');
          this.clientes = [];
          this.updatePaginatedClientes();
        }
      });
    } else {
      this.selectedEmpresaId = null;
      localStorage.removeItem('selectedEmpresaId');
      this.clientes = [];
      this.updatePaginatedClientes();
    }
    const imageElement = document.getElementById('fixedImageIcon') as HTMLImageElement;
    if (empresa && empresa.logoUrl && imageElement) {
      imageElement.src = empresa.logoUrl;
      imageElement.style.display = 'block';
    } else if (imageElement) {
      imageElement.src = '#';
      imageElement.style.display = 'none';
    }


    // Versión optimizada: obtiene clientes y tareas asociadas a cada cliente

  }*/


   onEmpresaSeleccionada1(empresa: any) {
    // Versión optimizada: obtiene clientes y tareas asociadas a cada cliente
    console.log('Empresa seleccionada:', empresa);
    this.selectedEmpresaId = empresa;
    if (empresa && empresa.id) {
      localStorage.setItem('selectedEmpresaId', String(empresa.id));
      this.clienteService.getClientesByEmpresaId(empresa.id).subscribe({
        next: (clientes) => {
          console.log('Clientes recibidos para empresa:', clientes);
          this.clientes = clientes || [];
          this.updatePaginatedClientes();
          // Obtener tareas asociadas a cada cliente
          if (this.clientes.length > 0) {
            this.clientes.forEach(cliente => {
              if (cliente.id) {
                this.userTareaService.getTareasByClienteId(cliente.id).subscribe({
                  next: (tareas) => {
                    console.log(`Tareas asociadas al cliente ${cliente.name} (ID: ${cliente.id}):`, tareas);
                  },
                  error: (error) => {
                    console.error(`Error al cargar tareas para cliente ${cliente.name} (ID: ${cliente.id}):`, error);
                  }
                });
              }
            });
          }
        },
        error: (error) => {
          console.error('Error al cargar clientes por empresa:', error);
          this.toastr.error(error.message || 'Error al cargar los clientes');
          this.clientes = [];
          this.updatePaginatedClientes();
        }
      });
    } else {
      this.selectedEmpresaId = null;
      localStorage.removeItem('selectedEmpresaId');
      this.clientes = [];
      this.updatePaginatedClientes();
    }
    const imageElement = document.getElementById('fixedImageIcon') as HTMLImageElement;
    if (empresa && empresa.logoUrl && imageElement) {
      imageElement.src = empresa.logoUrl;
      imageElement.style.display = 'block';
    } else if (imageElement) {
      imageElement.src = '#';
      imageElement.style.display = 'none';
    }
  }

  onEmpresaSeleccionada(empresa: any) {
  console.log('Empresa seleccionada:', empresa);
  this.selectedEmpresaId = empresa;

  // Limpiar cliente seleccionado al cambiar de empresa
  this.clienteSeleccionado = null;

  if (empresa && empresa.id) {
    localStorage.setItem('selectedEmpresaId', String(empresa.id));

    // Cargar datos de la empresa en el modal
    this.empresaName = empresa.name || '';
    this.empresaPhone = empresa.phone || '';
    this.empresaEmail = empresa.email || '';
    this.additionalDetailsEmpresa = empresa.description || '';
    this.empresaWebsite = empresa.website || '';
    this.empresaCuilCuit = empresa.cuilCuit || '';
    this.empresaTikTok = empresa.tiktok || '';
    this.empresaInstagram = empresa.instagram || '';
    this.empresaFacebook = empresa.facebook || '';

    // Actualizar imagen
    const imageElement = document.getElementById('fixedImageIcon') as HTMLImageElement;
    if (empresa.logoUrl && imageElement) {
      imageElement.src = empresa.logoUrl;
      imageElement.style.display = 'block';
    } else if (imageElement) {
      imageElement.src = '#';
      imageElement.style.display = 'none';
    }

    // Cargar clientes
    this.clienteService.getClientesByEmpresaId(empresa.id).subscribe({
      next: (clientes) => {
        console.log('Clientes recibidos para empresa:', clientes);
        this.clientes = clientes || [];
        this.updatePaginatedClientes();

        // Forzar detección de cambios si usas ChangeDetectionStrategy.OnPush
        // this.cdr.detectChanges();

        // Obtener tareas asociadas a cada cliente
        if (this.clientes.length > 0) {
          this.clientes.forEach(cliente => {
            if (cliente.id) {
              this.userTareaService.getTareasByClienteId(cliente.id).subscribe({
                next: (tareas) => {
                  console.log(`Tareas asociadas al cliente ${cliente.name} (ID: ${cliente.id}):`, tareas);
                },
                error: (error) => {
                  console.error(`Error al cargar tareas para cliente ${cliente.name} (ID: ${cliente.id}):`, error);
                }
              });
            }
          });
        }
      },
      error: (error) => {
        console.error('Error al cargar clientes por empresa:', error);

        // Limpiar clientes y cliente seleccionado
        this.clientes = [];
        this.clienteSeleccionado = null;
        this.updatePaginatedClientes();

        // Mensaje más amigable cuando no hay clientes
       /* if (error.status === 404) {
          this.toastr.info('Esta empresa no tiene clientes registrados aún', 'Sin clientes');
        } else {
          this.toastr.error(error.message || 'Error al cargar los clientes');
        }*/

        // Forzar detección de cambios
        // this.cdr.detectChanges();
      }
    });
  } else {
    // Limpiar todo si no hay empresa seleccionada
    this.selectedEmpresaId = null;
    this.clienteSeleccionado = null;
    localStorage.removeItem('selectedEmpresaId');
    this.clientes = [];
    this.updatePaginatedClientes();

    // Limpiar campos del modal
    this.empresaName = '';
    this.empresaPhone = '';
    this.empresaEmail = '';
    this.additionalDetailsEmpresa = '';
    this.empresaWebsite = '';
    this.empresaCuilCuit = '';

    const imageElement = document.getElementById('fixedImageIcon') as HTMLImageElement;
    if (imageElement) {
      imageElement.src = '#';
      imageElement.style.display = 'none';
    }
  }
}

onEmpresaSeleccionada0(empresa: Empresa) {
  console.log('Empresa seleccionada:', empresa);
  this.selectedEmpresa = empresa; // Objeto completo
  this.selectedEmpresaId = empresa?.id || null; // ID separado

  // Limpiar cliente seleccionado al cambiar de empresa
  this.clienteSeleccionado = null;

  if (empresa && empresa.id) {
    localStorage.setItem('selectedEmpresaId', String(empresa.id));

    // Cargar datos en el modal
    this.empresaName = empresa.name || '';
    this.empresaPhone = empresa.phone || '';
    this.empresaEmail = empresa.email || '';
    this.additionalDetailsEmpresa = empresa.description || '';
    this.empresaWebsite = empresa.website || '';
    this.empresaCuilCuit = empresa.cuilCuit || '';
    this.empresaTikTok = empresa.tiktok || '';
    this.empresaInstagram = empresa.instagram || '';
    this.empresaFacebook = empresa.facebook || '';

    // Actualizar imagen
    const imageElement = document.getElementById('fixedImageIcon') as HTMLImageElement;
    if (empresa.logoUrl && imageElement) {
      imageElement.src = empresa.logoUrl;
      imageElement.style.display = 'block';
    } else if (imageElement) {
      imageElement.src = '#';
      imageElement.style.display = 'none';
    }

    // Cargar clientes por empresa
    this.clienteService.getClientesByEmpresaId(empresa.id).subscribe({
      next: (clientes) => {
        console.log('Clientes recibidos para empresa:', clientes);
        this.clientes = clientes || [];
        this.updatePaginatedClientes();
      },
      error: (error) => {
        console.error('Error al cargar clientes por empresa:', error);
        this.clientes = [];
        this.clienteSeleccionado = null;
        this.updatePaginatedClientes();
      }
    });
  } else {
    // Limpieza cuando no hay empresa
    this.selectedEmpresa = null;
    this.selectedEmpresaId = null;
    this.clienteSeleccionado = null;
    localStorage.removeItem('selectedEmpresaId');
    this.clientes = [];
    this.updatePaginatedClientes();

    this.empresaName = '';
    this.empresaPhone = '';
    this.empresaEmail = '';
    this.additionalDetailsEmpresa = '';
    this.empresaWebsite = '';
    this.empresaCuilCuit = '';

    const imageElement = document.getElementById('fixedImageIcon') as HTMLImageElement;
    if (imageElement) {
      imageElement.src = '#';
      imageElement.style.display = 'none';
    }
  }
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

  actualizarImagenEmpresa(empresa: any) {
    const imageElement = document.getElementById('fixedImageIcon') as HTMLImageElement;
    if (empresa && empresa.logoUrl && imageElement) {
      imageElement.src = empresa.logoUrl;
      imageElement.style.display = 'block';
    } else if (imageElement) {
      imageElement.src = '#';
      imageElement.style.display = 'none';
    }
  }

  toggleSocialFields() {
    this.showSocialFields = !this.showSocialFields;
  }

  private hasSocialData(): boolean {
    return !!(this.empresaTikTok || this.empresaInstagram || this.empresaFacebook);
  }

  async loadWeather(): Promise<void> {
    const location = this.getLocationName();
    if (!location) {
      this.weatherError = 'Sin ubicación configurada';
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
    } catch (error) {
      console.error('Error al cargar clima', error);
      this.weatherError = 'No se pudo cargar el clima. Intenta más tarde.';
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
}

