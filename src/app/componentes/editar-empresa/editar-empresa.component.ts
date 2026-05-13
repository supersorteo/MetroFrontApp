import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EmpresaService } from '../../servicios/empresa.service';
import { UiDialogService } from '../../core/services/ui-dialog.service';
import { OfflineLocalStoreService } from '../../servicios/offline-local-store.service';

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
  loading = false;
  imagePreview: string | null = null;
  selectedFile: File | null = null;

  constructor(
    private route: ActivatedRoute,
    private empresaService: EmpresaService,
    public router: Router,
    private localStore: OfflineLocalStoreService,
    private uiDialog: UiDialogService
  ) {}

  private getStoredEmpresa(id: string): any | null {
    const selectedEmpresaRaw = localStorage.getItem('selectedEmpresa');
    if (!selectedEmpresaRaw) {
      return null;
    }

    try {
      const selectedEmpresa = JSON.parse(selectedEmpresaRaw);
      return String(selectedEmpresa?.id) === id ? selectedEmpresa : null;
    } catch {
      return null;
    }
  }

  private persistEmpresaLocally(empresa: any): void {
    if (!empresa?.id) {
      return;
    }

    localStorage.setItem('selectedEmpresa', JSON.stringify(empresa));
    localStorage.setItem('selectedEmpresaId', String(empresa.id));
    this.localStore.upsertEmpresa(empresa, Number(empresa.id) < 0 ? 'pending' : 'synced');
    this.localStore.setState(this.dashboardStateKey('selectedEmpresa'), empresa);
  }

  private dashboardStateKey(name: string): string {
    const userCode = this.empresa?.userCode || localStorage.getItem('userCode') || 'anon';
    return `dashboard:${userCode}:${name}`;
  }

  private async resolveEmpresaImagePreview(empresa: any): Promise<string | null> {
    const directLogo = String(empresa?.logoUrl || '');
    if (directLogo.startsWith('data:image/')) {
      return directLogo;
    }

    const localLogo = await this.localStore.getEmpresaLogoUrl({
      empresaId: Number(empresa?.id),
      userCode: empresa?.userCode || localStorage.getItem('userCode') || undefined,
      currentLogoUrl: directLogo
    });

    return localLogo || directLogo || null;
  }

  ngOnInit(): void {
    setTimeout(() => {
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach((bd) => bd.parentNode?.removeChild(bd));
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.documentElement.classList.remove('modal-open');
      document.documentElement.style.overflow = '';

      const modals = [
        'exampleModal',
        'imageModal',
        'clientModal',
        'miModal',
        'listaEmpresasModal',
        'listaClientesModal'
      ];

      modals.forEach((modalId) => {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
          modalElement.classList.remove('show');
        }
      });
    }, 0);

    this.empresaId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.empresaId) {
      return;
    }

    const isTrial = localStorage.getItem('trialMode') === 'true';
    if (isTrial) {
      const demoEmpresasRaw = localStorage.getItem('demoEmpresas');
      const demoEmpresas = demoEmpresasRaw ? JSON.parse(demoEmpresasRaw) : [];
      const empresa = demoEmpresas.find((e: any) => String(e.id) === this.empresaId);
      if (empresa) {
        this.empresa = { ...empresa };
        this.imagePreview = this.empresa.logoUrl || null;
      }
      return;
    }

    this.loading = true;
    this.empresaService.getEmpresaById(Number(this.empresaId)).subscribe({
      next: async (data: any) => {
        this.empresa = { ...data };
        this.imagePreview = await this.resolveEmpresaImagePreview(this.empresa);
        this.loading = false;
      },
      error: async () => {
        const indexedEmpresa = await this.localStore.getEmpresaByLocalOrServerId(Number(this.empresaId));
        const storedEmpresa = indexedEmpresa || this.getStoredEmpresa(this.empresaId);
        if (storedEmpresa) {
          this.empresa = { ...storedEmpresa };
          this.imagePreview = await this.resolveEmpresaImagePreview(this.empresa);
        }
        this.loading = false;
      }
    });
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
    if (!(this.selectedFile && this.empresa.userCode)) {
      return;
    }

    this.loading = true;
    this.empresaService.uploadImage(this.selectedFile, this.empresa.userCode, Number(this.empresaId)).subscribe({
      next: (url: string) => {
        this.empresa.logoUrl = url;
        this.imagePreview = url;
        if (this.empresa?.id) {
          this.localStore.upsertEmpresa(this.empresa, String(url).startsWith('data:image/') ? 'pending' : 'synced');
          this.localStore.setState(this.dashboardStateKey('selectedEmpresa'), this.empresa);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  actualizarEmpresa() {
    if (!this.empresaId) {
      return;
    }

    const syncedUploadedImage = localStorage.getItem('uploadedImage') || '';
    if (navigator.onLine && String(this.empresa.logoUrl || '').startsWith('data:image/')) {
      this.empresa.logoUrl = syncedUploadedImage || this.empresa.logoUrl;
      this.imagePreview = this.empresa.logoUrl || null;
    }

    if (!this.empresa.name || !this.empresa.name.trim()) {
      this.uiDialog.warning({ title: 'Campo obligatorio', text: 'El nombre de la empresa no puede estar vacío.' });
      return;
    }
    if (!this.empresa.phone || !this.empresa.phone.trim()) {
      this.uiDialog.warning({ title: 'Campo obligatorio', text: 'El teléfono de la empresa no puede estar vacío.' });
      return;
    }
    if (!this.empresa.email || !this.empresa.email.trim()) {
      this.uiDialog.warning({ title: 'Campo obligatorio', text: 'El email de la empresa no puede estar vacío.' });
      return;
    }
    if (!this.empresa.logoUrl || !this.empresa.logoUrl.trim()) {
      this.uiDialog.warning({ title: 'Campo obligatorio', text: 'Debes subir una imagen para la empresa.' });
      return;
    }

    this.uiDialog.confirm({
      title: 'Confirmar edición',
      text: '¿Deseas guardar los cambios de la empresa?',
      confirmText: 'Sí, guardar',
      cancelText: 'Cancelar',
      tone: 'primary',
      icon: 'question'
    }).then(confirmed => {
      if (!confirmed) {
        return;
      }

      this.loading = true;

      const isTrial = localStorage.getItem('trialMode') === 'true';
      if (isTrial) {
        const demoEmpresasRaw = localStorage.getItem('demoEmpresas');
        const demoEmpresas = demoEmpresasRaw ? JSON.parse(demoEmpresasRaw) : [];
        const idx = demoEmpresas.findIndex((e: any) => String(e.id) === this.empresaId);
        if (idx !== -1) {
          demoEmpresas[idx] = { ...demoEmpresas[idx], ...this.empresa };
          localStorage.setItem('demoEmpresas', JSON.stringify(demoEmpresas));
          this.persistEmpresaLocally(demoEmpresas[idx]);
        }
        this.loading = false;
        this.uiDialog.success({ title: 'Guardado', text: 'La empresa demo se actualizó correctamente.' }).then(() => {
          this.router.navigate(['/dashboard']);
        });
        return;
      }

      this.empresaService.updateEmpresa(Number(this.empresaId), this.empresa).subscribe({
        next: (data: any) => {
          this.loading = false;
          const empresaActualizada = { ...this.empresa, ...data };
          this.persistEmpresaLocally(empresaActualizada);
          this.uiDialog.success({ title: 'Guardado', text: 'La empresa se actualizó correctamente.' }).then(() => {
            this.router.navigate(['/dashboard'], { state: { empresaActualizada } });
          });
        },
        error: () => {
          this.loading = false;
          this.uiDialog.error({ title: 'Error', text: 'No se pudo actualizar la empresa.' });
        }
      });
    });
  }
}
