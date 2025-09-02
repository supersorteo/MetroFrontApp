import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EmpresaService } from '../../servicios/empresa.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editar-empresa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-empresa.component.html',
  styleUrl: './editar-empresa.component.scss'
})
export class EditarEmpresaComponent implements OnInit {
  empresa: any = {};
  empresaId: string = '';
  loading: boolean = false;
  imagePreview: string | null = null;
  selectedFile: File | null = null;

  constructor(
    private route: ActivatedRoute,
    private empresaService: EmpresaService,
    public router: Router
  ) {}

  ngOnInit(): void {
    // Eliminar cualquier backdrop de modal y desbloquear scroll
    setTimeout(() => {
      // Elimina todos los backdrops y clases de modal-open en body y html
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(bd => bd.parentNode?.removeChild(bd));
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.documentElement.classList.remove('modal-open');
      document.documentElement.style.overflow = '';
      // Eliminar backdrop extra por si hay más de uno
      const modals = ['exampleModal', 'imageModal', 'clientModal', 'miModal', 'listaEmpresasModal', 'listaClientesModal'];
      modals.forEach(modalId => {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
          modalElement.classList.remove('show');
        }
      });
    }, 0);
    this.empresaId = this.route.snapshot.paramMap.get('id') || '';
    if (this.empresaId) {
      this.loading = true;
      this.empresaService.getEmpresaById(Number(this.empresaId)).subscribe({
        next: (data: any) => {
          this.empresa = { ...data };
          this.imagePreview = this.empresa.logoUrl || null;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    }
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  subirImagen() {
    if (this.selectedFile && this.empresa.userCode) {
      this.loading = true;
      this.empresaService.uploadImage(this.selectedFile, this.empresa.userCode).subscribe({
        next: (url: string) => {
          this.empresa.logoUrl = url;
          this.imagePreview = url;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    }
  }

  actualizarEmpresa() {
    if (!this.empresaId) return;
    // Validaciones de campos obligatorios
    if (!this.empresa.name || !this.empresa.name.trim()) {
      Swal.fire('Campo obligatorio', 'El nombre de la empresa no puede estar vacío.', 'warning');
      return;
    }
    if (!this.empresa.phone || !this.empresa.phone.trim()) {
      Swal.fire('Campo obligatorio', 'El teléfono de la empresa no puede estar vacío.', 'warning');
      return;
    }
    if (!this.empresa.email || !this.empresa.email.trim()) {
      Swal.fire('Campo obligatorio', 'El email de la empresa no puede estar vacío.', 'warning');
      return;
    }
    if (!this.empresa.logoUrl || !this.empresa.logoUrl.trim()) {
      Swal.fire('Campo obligatorio', 'Debes subir una imagen para la empresa.', 'warning');
      return;
    }
    Swal.fire({
      title: '¿Confirmar edición?',
      text: '¿Deseas guardar los cambios de la empresa?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading = true;
        this.empresaService.updateEmpresa(Number(this.empresaId), this.empresa).subscribe({
          next: (data: any) => {
            this.loading = false;
            Swal.fire('¡Guardado!', 'La empresa se actualizó correctamente.', 'success').then(() => {
              this.router.navigate(['/dashboard'], { state: { empresaActualizada: data } });
            });
          },
          error: () => {
            this.loading = false;
            Swal.fire('Error', 'No se pudo actualizar la empresa.', 'error');
          }
        });
      }
    });
  }





}
