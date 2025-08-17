import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../servicios/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Tarea, TareaService } from '../../servicios/tarea.service';
import { Provincia, ProvinciaService } from '../../servicios/provincia.service';
import { UserTarea, UserTareaService } from '../../servicios/user-tarea.service';
import { PresupuestoService } from '../../servicios/presupuesto.service';


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
  private reabrirEmpresaModal = false;
  // Control de modales para empresa e imagen
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
  empresaName: string = '';
  empresaPhone: string = '';
  empresaEmail: string = '';
  additionalDetailsEmpresa: string = '';
  clientName: string = '';
  clientContact: string = '';
  budgetDate: string = '';
  additionalDetailsClient: string = '';
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

  constructor(
    private authService: AuthService,
    private route:Router,
    private tareaService: TareaService,
    private provinciaService: ProvinciaService,
    private userTareaService: UserTareaService,
    private presupuestoService: PresupuestoService,
    private toastr: ToastrService ){}

  ngOnInit() {


    this.loadUserCode()
    this.loadTareasAgregadas();

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



      resetTareaSeleccionada0(): void {
    this.tareaSeleccionada = {
      tarea: '',
      costo: 0,
      rubro: '',
      categoria: '',
      pais: this.userData?.pais || '',
      descripcion: '',
      descuento: 0,
      area: 1,
      totalCost: 0
    };
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



    uploadImage(): void {
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

onImageChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.imageSelected = !!(target.files && target.files[0]);
  }




saveFormData() {
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

saveClientData() {
  const clientData = {
    clientName: this.clientName,
    clientContact: this.clientContact,
    budgetDate: this.budgetDate,
    additionalDetailsClient: this.additionalDetailsClient
  };

  localStorage.setItem('clientData', JSON.stringify(clientData));
  console.log('Datos del cliente guardados:', clientData)
  this.toastr.success('Datos del cliente guardados con éxito.');
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
