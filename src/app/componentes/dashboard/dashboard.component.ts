import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../servicios/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Tarea, TareaService } from '../../servicios/tarea.service';
import { Provincia, ProvinciaService } from '../../servicios/provincia.service';
import { UserTarea, UserTareaService } from '../../servicios/user-tarea.service';
import { PresupuestoService } from '../../servicios/presupuesto.service';
import { EmpresaService } from '../../servicios/empresa.service';
import { Cliente, ClienteService } from '../../servicios/cliente.service';
import Swal from 'sweetalert2';


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
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit{
  clienteAEliminar: number | null = null;
  mostrarModalConfirmacion = false;

  editarCliente(id: number) {
    this.route.navigate([`/editar-clientes`, id]);
  }


  isSavingClient = false;
  private reabrirEmpresaModal = false;
  // Control de modales para empresa e imagen

  empresaName: string = '';
  empresaPhone: string = '';
  empresaEmail: string = '';
  additionalDetailsEmpresa: string = '';
  clientName: string = '';
  clientContact: string = '';
  budgetDate: string = '';
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
  tareasAgregadas: UserTarea[] = [];


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

  constructor(
    private authService: AuthService,
    private route:Router,
    private tareaService: TareaService,
    private provinciaService: ProvinciaService,
    private userTareaService: UserTareaService,
    private presupuestoService: PresupuestoService,
    private empresaService: EmpresaService,
    private clienteService: ClienteService,
    private toastr: ToastrService ){}

  ngOnInit() {
    this.loadUserCode();
    this.loadTareasAgregadas();

    // Recargar clientes si se editó alguno
    if (localStorage.getItem('reloadClientes')) {
      this.getClientesByUserCode();
      localStorage.removeItem('reloadClientes');
    }

    const uploadedImage = localStorage.getItem('uploadedImage');
    const imageElement = document.getElementById('fixedImageIcon') as HTMLImageElement;
    if (uploadedImage && imageElement) {
      imageElement.src = uploadedImage;
      imageElement.style.display = 'block';
    }

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
    const modals = ['exampleModal', 'imageModal', 'clientModal', 'listaClientesModal', 'miModal'];
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

    // Lógica para reabrir clientModal al cerrar listaClientesModal
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
  if (this.userCode) {
    this.userTareaService.getTareasByUserCode(this.userCode).subscribe({
      next: (tareas) => {
        this.tareasAgregadasUser = tareas;
        this.mostrarTabla = tareas.length > 0;
        console.log('Tareas agregadas cargadas:', this.tareasAgregadas);
      },
      error: () => this.toastr.error('Error al cargar las tareas agregadas', 'Error')
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

    seleccionar(tarea: Tarea): void {
    this.tareaSeleccionada = { ...tarea, totalCost: this.calcularTotalCosto(tarea) };
     console.log('Tarea seleccionada:', this.tareaSeleccionada);
    this.abrirModal();
  }





    abrirModal(): void {
      const modal = new bootstrap.Modal(document.getElementById('miModal') as HTMLElement);
      modal.show();
    }




actualizarTarea0(): void {
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
        this.loadTareasAgregadas(); // Recargar desde backend y actualizar localStorage
        this.resetTareaSeleccionada();
      },
      error: () => {
        const index = this.tareasAgregadas.findIndex(t => t.id === this.tareaSeleccionada.id);
        if (index !== -1) {
          this.tareasAgregadas[index] = updatedTarea; // Actualizar localmente
          localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
          this.toastr.error('Error al actualizar la tarea en el backend, actualizada localmente', 'Error');
        }
        this.resetTareaSeleccionada();
      }
    });
  }
}


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
}






agregarTarea(): void {
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
}



verPresupuesto(): void {
  this.presupuestoService.setTareasAgregadas(this.tareasAgregadas); // Pasar datos al servicio
  this.route.navigate(['/presupuesto']);
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

eliminarTarea(id: number): void {
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



uploadImage(): void {
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


onImageChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.imageSelected = !!(target.files && target.files[0]);
  }




saveFormData0() {
  const formData = {
    empresaName: this.empresaName,
    empresaPhone: this.empresaPhone,
    empresaEmail: this.empresaEmail,
    additionalDetailsempresa: this.additionalDetailsEmpresa,
    image: localStorage.getItem('uploadedImage')
  };
  localStorage.setItem('empresaData', JSON.stringify(formData));
  this.toastr.success('Datos de la empresa guardados con éxito.');
}



saveFormData() {
  const formData = {
    name: this.empresaName,
    phone: this.empresaPhone,
    email: this.empresaEmail,
    description: this.additionalDetailsEmpresa,
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
      direccion: this.clientDireccion
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

    }
