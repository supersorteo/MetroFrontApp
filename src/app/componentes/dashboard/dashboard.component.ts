import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../servicios/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { TareaService } from '../../servicios/tarea.service';

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

interface Tarea {
  id?: number;
  nombre: string;
  costo: number;
  area: number;
  descripcion: string;
  descuento: number;
  totalCost?: number;
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
 // @ViewChild('imageInput') imageInput!: ElementRef;
//  @ViewChild('modalImagePreview') modalImagePreview!: ElementRef;
//  @ViewChild('uploadMessage') uploadMessage!: ElementRef;



  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('modalImagePreview') modalImagePreview!: ElementRef<HTMLImageElement>;
  @ViewChild('uploadMessage') uploadMessage!: ElementRef<HTMLParagraphElement>;
  imageSelected: boolean = false;

  tareas: Tarea[] = [];
  tareasFiltradas: Tarea[] = [];
  //tareaSeleccionada: Tarea | null = null;
  mostrarTabla: boolean = false;
  tareasAgregadas: Tarea[] = [];
  tareaSeleccionada: Tarea = {
    nombre: '',
    costo: 0,
    area: 1,
    descripcion: '',
    descuento: 0,
    totalCost: 0
  };

  isContentVisible: boolean = false;

  constructor(
    private authService: AuthService,
    private route:Router,
    private tareaService: TareaService,
    private toastr: ToastrService ){}

  ngOnInit() {
    //this.loadFormData();
    //this.loadImageFromLocalStorage();

    this.loadUserCode()


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
    this.tareaService.getTareas().subscribe(
      tareas => {
        this.tareas = tareas;
        this.tareasFiltradas = tareas;
        console.log('Tareas:', this.tareas);
      }, error => {
        console.error('Error al obtener las tareas:', error);
      } );
    }

    seleccionar(tarea: Tarea): void {
      //this.tareaSeleccionada = tarea;

      this.tareaSeleccionada = { ...tarea };
      console.log('Tarea seleccionada:', this.tareaSeleccionada);
      this.abrirModal();
    }

    abrirModal(): void {
      const modal = new bootstrap.Modal(document.getElementById('miModal') as HTMLElement);
      modal.show();
    }

    actualizarTarea(): void {
      if (this.tareaSeleccionada && this.tareaSeleccionada.id) {
        this.tareaService.actualizarTarea(this.tareaSeleccionada.id, this.tareaSeleccionada).subscribe(
          tarea => {
            console.log('Tarea actualizada:', tarea);
            this.obtenerTareas();
          },
          error => {
            console.error('Error al actualizar la tarea:', error);
          } );
        }
      }


      agregarTarea1(): void {
        const nuevaTarea: Tarea = {
          ...this.tareaSeleccionada,
          costo: this.tareaSeleccionada.costo,
          area: this.tareaSeleccionada.area,
          descripcion: this.tareaSeleccionada.descripcion,
          descuento: this.tareaSeleccionada.descuento
        };
        nuevaTarea.totalCost = nuevaTarea.area * nuevaTarea.costo * (1 - nuevaTarea.descuento / 100);
        this.tareas.push(nuevaTarea); this.resetTareaSeleccionada();
      }

      agregarTarea0(): void {
        const nuevaTarea: Tarea = {
         ...this.tareaSeleccionada,
         totalCost: this.calcularTotalCosto(this.tareaSeleccionada)
        };
        this.tareas.push(nuevaTarea);
        this.resetTareaSeleccionada();
      }

      agregarTarea(): void {
        const nuevaTarea: Tarea = {
          ...this.tareaSeleccionada,
          totalCost: this.calcularTotalCosto(this.tareaSeleccionada)
        };
        //this.tareasFiltradas.push(nuevaTarea);
        this.tareasAgregadas.push(nuevaTarea);
        this.mostrarTabla = true;
        this.resetTareaSeleccionada();
      }

      buscar(event: Event): void { const filtro = (event.target as HTMLInputElement).value.toLowerCase(); this.tareasFiltradas = this.tareas.filter(tarea => tarea.nombre.toLowerCase().includes(filtro) || tarea.descripcion.toLowerCase().includes(filtro) || tarea.costo.toString().includes(filtro) || tarea.area.toString().includes(filtro) || tarea.descuento.toString().includes(filtro) ); }

      eliminarTarea1(index: number): void {
        if (index >= 0 && index < this.tareas.length) {
          this.tareas.splice(index, 1);
        }
      }

      eliminarTarea(index: number): void {
        if (index >= 0 && index < this.tareasAgregadas.length) {
          this.tareasAgregadas.splice(index, 1);
        }
      }

      calcularTotalCosto1(tarea: Tarea): number {
        return tarea.area * tarea.costo * (1 - tarea.descuento / 100);
      }
      calcularTotalCosto2(tarea: Tarea): number {
        return (tarea.area || 0) * (tarea.costo || 0) * (1 - (tarea.descuento || 0) / 100);
      }

      calcularCostoTotal1(): number { return this.tareas.reduce((total, tarea) => total + this.calcularTotalCosto(tarea), 0); }

      calcularTotalCosto(tarea: Tarea): number { return (tarea.area || 0) * (tarea.costo || 0) * (1 - (tarea.descuento || 0) / 100); }
      calcularCostoTotal(): number { return this.tareasAgregadas.reduce((total, tarea) => total + (tarea.totalCost || 0), 0); }


      resetTareaSeleccionada() { this.tareaSeleccionada = { nombre: '', costo: 0, area: 1, descripcion: '', descuento: 0, totalCost: 0 }; }

  logout(): void {
    this.authService.logout();
    this.route.navigate(['']);
    this.toastr.success('Logout exitoso', 'Éxito');
  }

  mostrarCodigo2() {
    const codigo = document.getElementById('codigo') as HTMLElement;
    if (codigo.style.display === 'none') {
      codigo.style.display = 'block';
    } else {
      codigo.style.display = 'none';
    }

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

  uploadImage0(): void {
    const fileInput = this.imageInput?.nativeElement as HTMLInputElement;
    if (!fileInput) {
      this.toastr.error('Error: No se encontró el campo de imagen.');
      return;
    }
    const file = fileInput.files?.[0];
    if (file) {
      const img = new Image();
      img.onload = () => {
        if (img.width !== 1080 || img.height !== 1080) {
          this.toastr.error('La imagen debe ser 1080x1080px.');
          return;
        }
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
          if (mainPreview) {
            mainPreview.src = imageBase64;
            mainPreview.style.display = 'block';
          }
          this.uploadMessage.nativeElement.style.display = 'block';
          this.toastr.success('Imagen subida con éxito.');
          fileInput.value = '';
          this.imageSelected = false;
        };
        reader.readAsDataURL(file);
      };
      img.src = URL.createObjectURL(file);
    } else {
      this.toastr.error('Por favor, selecciona una imagen.');
    }
  }



uploadImage1(): void {
  const fileInput = this.imageInput?.nativeElement as HTMLInputElement;
  if (!fileInput) {
    console.error('Error: Elemento de entrada de imagen no encontrado.');
    this.toastr.error('Error: No se encontró el campo de imagen.');
    return;
  }
  const file = fileInput.files?.[0];
  if (file) {
    const img = new Image();
    img.onload = () => {
      if (img.width !== 1080 || img.height !== 1080) {
        this.toastr.error('La imagen debe ser 1080x1080px.');
        return;
      }
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
        if (mainPreview) {
          mainPreview.src = imageBase64;
          mainPreview.style.display = 'block';
        }
        this.uploadMessage.nativeElement.style.display = 'block';
        console.log('Imagen subida con éxito.');
        this.toastr.success('Imagen subida con éxito.');
      };
      reader.readAsDataURL(file);
    };
    img.src = URL.createObjectURL(file);
  } else {
    console.error('Error: No se seleccionó ninguna imagen.');
    this.toastr.error('Por favor, selecciona una imagen.');
  }
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

/*
    saveFormData() {
      const formData = {
        empresaName: this.empresaName,
        empresaPhone: this.empresaPhone,
        empresaEmail: this.empresaEmail,
        additionalDetailsempresa: this.additionalDetailsEmpresa,
        image: localStorage.getItem('uploadedImage'),
       };
       localStorage.setItem('empresaData', JSON.stringify(formData));
       const successAlert = document.getElementById('successAlert') as HTMLDivElement;
       successAlert.style.display = 'block';
       setTimeout(
        () => {
        successAlert.style.display = 'none';
      }, 2000);
    }*/

    /*
    saveClientData() {
      const clientData = {
        clientName: this.clientName,
        clientContact: this.clientContact,
        budgetDate: this.budgetDate,
        additionalDetailsClient: this.additionalDetailsClient,
      };
      localStorage.setItem('clientData', JSON.stringify(clientData));
      const confirmationMessage = document.getElementById('confirmationMessage') as HTMLHeadingElement;
      confirmationMessage.style.display = 'block';
      setTimeout(
        () => {
          confirmationMessage.style.display = 'none';
        }, 2000);
      }*/




      //mostrarAlerta(mensaje: string): void {  alert(mensaje); }

      mostrarAlerta(mensaje: string): void {
        this.toastr.success(mensaje);
      }

      disminuirPrecios(): void {
        const porcentaje = this.porcentajeBajar;
        if (isNaN(porcentaje) || porcentaje <= 0) {
          this.toastr.error('Por favor, ingrese un porcentaje válido para bajar.');
          return;
        }
        this.tareasFiltradas = this.tareasFiltradas.map(tarea => {
          tarea.costo = tarea.costo * (1 - porcentaje / 100);
          tarea.totalCost = tarea.area * tarea.costo * (1 - tarea.descuento / 100);
          console.log(`Tarea: ${tarea.nombre}, Nuevo Costo: ${tarea.costo}, Nuevo Total: ${tarea.totalCost}`);
          return tarea;
        });
        this.toastr.success(`Toda la lista se redujo un ${porcentaje}%`);
        this.porcentajeBajar = null;
      }


      ajustarPrecios(): void {
        const porcentaje = this.porcentajeSubir;
        if (isNaN(porcentaje) || porcentaje <= 0) {
          this.toastr.error('Por favor, ingrese un porcentaje válido para subir.');
          return;
        }
        this.tareasFiltradas = this.tareasFiltradas.map(
          tarea => {
            tarea.costo = tarea.costo * (1 + porcentaje / 100);
            tarea.totalCost = tarea.area * tarea.costo * (1 - tarea.descuento / 100);
            console.log(`Tarea: ${tarea.nombre}, Nuevo Costo: ${tarea.costo}, Nuevo Total: ${tarea.totalCost}`);
            return tarea;
          });
          this.toastr.success(`Toda la lista se incrementó un ${porcentaje}%`);
          this.porcentajeSubir = null;
        }

      loadUserCode(): void {
        this.userCode = localStorage.getItem('userCode') || '';
        if (this.userCode) {
          this.fetchUserData();
        } else {
          this.toastr.error('Código de usuario no encontrado en el localStorage', 'Error');
        }
      }






          fetchUserData(): void {
            this.authService.getUserCode(this.userCode).subscribe(
              response => {
                this.userData = response;
                console.log('Datos del usuario:', response);
                localStorage.setItem('userData', JSON.stringify(this.userData))
                if (this.userData.fechaVencimiento) {
                  this.calculateRemainingTime(this.userData.fechaVencimiento);
                }
              },
              error => {
                this.toastr.error('Error al obtener los datos del usuario', 'Error');
              } );
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
