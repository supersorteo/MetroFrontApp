import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppToastService } from '../../servicios/app-toast.service';
import { UiDialogService } from '../../core/services/ui-dialog.service';
import { AuthService } from '../../servicios/auth.service';
import { Admin, AdminMembershipLimits, AdminService } from '../../servicios/admin.service';
import { Tarea, TareaService } from '../../servicios/tarea.service';

interface AccessCode {
  code: string;
  email: any;
  pais?: string;
  tipo?: string;
  username?: string;
  telefono?: string;
  provincia?: string;
  fechaRegistro?: any;
  fechaVencimiento?: any;
  remainingTime?: string;
}

@Component({
  selector: 'app-generate-code',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './generate-code.component.html',
  styleUrl: './generate-code.component.scss'
})
export class GenerateCodeComponent implements OnInit, OnDestroy {
  admin!: Admin;

  code = '';
  codes: AccessCode[] = [];
  filteredCodes: AccessCode[] = [];
  generatedCodes: AccessCode[] = [];

  filterText = '';
  codeCount3 = 1;
  codeCount6 = 1;

  currentPage = 1;
  itemsPerPage = 8;
  totalPages = 0;

  showGenerate3Panel = false;
  showGenerate6Panel = false;
  showGeneratedModal = false;
  showEditAdminPanel = false;
  showLimitsPanel = false;

  tareas: Tarea[] = [];
  filteredTareas: Tarea[] = [];
  tareaFilter = '';
  showTareaForm = false;
  tareaEditingId: number | null = null;
  tareaSubmitted = false;
  tareaForm: Omit<Tarea, 'id' | 'pais' | 'totalCost'> = {
    tarea: '',
    descripcion: '',
    costo: 0,
    rubro: '',
    categoria: '',
    area: 1,
    descuento: 0
  };

  editAdminNombre = '';
  editAdminUsername = '';
  editAdminPassword = '';
  editAdminPasswordNew = '';
  editAdminError = '';
  showEditPassword = false;
  showEditPasswordNew = false;

  membershipLimits: AdminMembershipLimits | null = null;
  limitsDraft: AdminMembershipLimits | null = null;
  limitsSaving = false;

  totalCodes = 0;
  activeCodes = 0;
  expiredCodes = 0;
  unregisteredCodes = 0;

  private timer: any;

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private tareaService: TareaService,
    private router: Router,
    private appToast: AppToastService,
    private uiDialog: UiDialogService
  ) {}

  ngOnInit(): void {
    const admin = this.adminService.getCurrentAdmin();
    if (!admin) {
      this.router.navigate(['/']);
      return;
    }

    this.admin = admin;
    this.loadCodes();
    this.loadTareas();
    this.loadMembershipLimits();
    this.timer = setInterval(() => this.updateRemainingTimes(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  logout(): void {
    this.uiDialog.confirmLogout().then(confirmed => {
      if (confirmed) {
        this.adminService.logout();
        this.router.navigate(['/']);
      }
    });
  }

  goBack(): void {
    const returnUrl = this.adminService.consumeReturnUrl();
    if (returnUrl && returnUrl !== '/admin-generate-code') {
      this.router.navigateByUrl(returnUrl);
      return;
    }
    this.router.navigate(['/']);
  }

  loadCodes(): void {
    this.authService.getCodesByPais(this.admin.pais).subscribe({
      next: response => {
        this.codes = response
          .map(code => ({
            ...code,
            tipo: code.code.length === 5 ? '3 meses' : '6 meses',
            fechaRegistro: code.fechaRegistro || '',
            fechaVencimiento: code.fechaVencimiento || ''
          }))
          .sort((a, b) => {
            const dA = new Date(a.fechaRegistro).getTime();
            const dB = new Date(b.fechaRegistro).getTime();
            if (isNaN(dA) || isNaN(dB)) return isNaN(dA) ? 1 : -1;
            return dB - dA;
          });
        this.applyFilter();
        this.computeStats();
      },
      error: () => this.appToast.error('Error al cargar los códigos')
    });
  }

  applyFilter(): void {
    const f = this.filterText.toLowerCase();
    this.filteredCodes = f
      ? this.codes.filter(c =>
          (c.code?.toLowerCase().includes(f)) ||
          (c.email?.toLowerCase().includes(f)) ||
          (c.username?.toLowerCase().includes(f)) ||
          (c.telefono?.toLowerCase().includes(f)) ||
          (c.provincia?.toLowerCase().includes(f)) ||
          (String(c.fechaRegistro || '').toLowerCase().includes(f)) ||
          (String(c.fechaVencimiento || '').toLowerCase().includes(f))
        )
      : [...this.codes];
    this.currentPage = 1;
    this.updatePagination();
  }

  computeStats(): void {
    const now = new Date().getTime();
    this.totalCodes = this.codes.length;
    this.unregisteredCodes = this.codes.filter(c => !c.email).length;
    this.activeCodes = this.codes.filter(c => {
      if (!c.fechaVencimiento) return false;
      const exp = new Date(c.fechaVencimiento).getTime();
      return !isNaN(exp) && exp > now;
    }).length;
    this.expiredCodes = this.codes.filter(c => {
      if (!c.fechaVencimiento) return false;
      const exp = new Date(c.fechaVencimiento).getTime();
      return !isNaN(exp) && exp <= now;
    }).length;
  }

  filterCodes(): void {
    this.applyFilter();
  }

  validateAndGenerateCode(): void {
    if (!this.code.trim()) {
      this.appToast.error('Debe ingresar un código');
      return;
    }

    this.authService.agregarCode({ code: this.code, email: null, pais: this.admin.pais }).subscribe({
      next: response => {
        if (response.message === 'Código agregado con éxito') {
          this.appToast.success(response.message);
          this.code = '';
          this.loadCodes();
        } else {
          this.appToast.error(response.message);
        }
      },
      error: err => this.appToast.error(err.message)
    });
  }

  generateCodes(months: 3 | 6): void {
    const count = months === 3 ? this.codeCount3 : this.codeCount6;
    if (count <= 0) {
      this.appToast.error('Cantidad inválida');
      return;
    }

    const length = months === 3 ? 5 : 6;
    const newCodes: AccessCode[] = Array.from({ length: count }, () => ({
      code: this.randomCode(length),
      email: null,
      pais: this.admin.pais,
      tipo: months === 3 ? '3 meses' : '6 meses'
    }));

    this.generatedCodes = newCodes;
    this.showGenerate3Panel = false;
    this.showGenerate6Panel = false;
    this.showGeneratedModal = true;

    this.authService.agregarCodes(newCodes).subscribe({
      next: res => {
        this.appToast.success(res.message);
        this.loadCodes();
      },
      error: err => this.appToast.error(err.message)
    });
  }

  randomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  confirmDeleteCode(code: string): void {
    this.uiDialog.confirmDelete(code, `¿Eliminar el código ${code}? Esta acción no se puede deshacer.`).then(confirmed => {
      if (!confirmed) return;
      this.authService.deleteCode(code).subscribe({
        next: () => {
          this.appToast.success('Código eliminado');
          this.loadCodes();
        },
        error: () => this.appToast.error('Error al eliminar')
      });
    });
  }

  copyToClipboard(code: string): void {
    navigator.clipboard.writeText(code).then(
      () => this.appToast.success('Copiado al portapapeles', 'Portapapeles'),
      () => this.appToast.error('Error al copiar')
    );
  }

  getPaginatedCodes(): AccessCode[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredCodes.slice(start, start + this.itemsPerPage);
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredCodes.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) this.currentPage = 1;
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  updateRemainingTimes(): void {
    this.filteredCodes.forEach(c => {
      if (c.fechaVencimiento) c.remainingTime = this.calcRemaining(c.fechaVencimiento);
    });
  }

  calcRemaining(fechaVencimiento: string): string {
    if (!fechaVencimiento) return '–';
    const diff = new Date(fechaVencimiento).getTime() - Date.now();
    if (isNaN(diff)) return 'Fecha inválida';
    if (diff <= 0) return 'Expirado';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${d}d ${h}h ${m}m ${s}s`;
  }

  openEditAdmin(): void {
    this.editAdminNombre = this.admin.nombre;
    this.editAdminUsername = this.admin.username;
    this.editAdminPassword = this.admin.password;
    this.editAdminPasswordNew = '';
    this.editAdminError = '';
    this.showEditAdminPanel = true;
  }

  loadMembershipLimits(): void {
    this.adminService.getLimitsByPais(this.admin.pais).subscribe({
      next: limits => {
        if (!limits) return;
        this.membershipLimits = limits;
      },
      error: () => this.appToast.error('Error al cargar los límites de membresía')
    });
  }

  openLimitsPanel(): void {
    const base = this.membershipLimits ?? {
      id: this.admin.id,
      pais: this.admin.pais,
      demoMaxEmpresas: 3,
      vip3MaxEmpresas: 1,
      vip6MaxEmpresas: 3,
      demoMaxClientes: 6,
      vip3MaxClientes: 30,
      vip6MaxClientes: 60
    };

    this.limitsDraft = { ...base };
    this.showLimitsPanel = true;
  }

  closeLimitsPanel(): void {
    this.showLimitsPanel = false;
    this.limitsDraft = null;
    this.limitsSaving = false;
  }

  saveLimits(): void {
    if (!this.limitsDraft?.id) {
      this.appToast.error('No se pudo identificar la configuración a actualizar');
      return;
    }

    const values = [
      this.limitsDraft.demoMaxEmpresas,
      this.limitsDraft.vip3MaxEmpresas,
      this.limitsDraft.vip6MaxEmpresas,
      this.limitsDraft.demoMaxClientes,
      this.limitsDraft.vip3MaxClientes,
      this.limitsDraft.vip6MaxClientes
    ];

    if (values.some(value => Number(value) < 0 || Number.isNaN(Number(value)))) {
      this.appToast.warning('Todos los límites deben ser números válidos mayores o iguales a 0');
      return;
    }

    this.limitsSaving = true;
    this.adminService.updateLimits(this.limitsDraft.id, this.limitsDraft).subscribe({
      next: updated => {
        this.limitsSaving = false;
        if (!updated) {
          this.appToast.error('No se pudieron actualizar los límites');
          return;
        }
        this.membershipLimits = updated;
        this.appToast.success('Límites actualizados');
        this.closeLimitsPanel();
      },
      error: () => {
        this.limitsSaving = false;
        this.appToast.error('Error al guardar los límites');
      }
    });
  }

  saveAdminChanges(): void {
    if (!this.editAdminUsername.trim()) {
      this.editAdminError = 'El usuario no puede estar vacío.';
      return;
    }

    const newPass = this.editAdminPasswordNew.trim() || this.editAdminPassword;
    this.adminService.updateAdmin(this.admin.id, {
      nombre: this.editAdminNombre,
      username: this.editAdminUsername,
      password: newPass
    }).subscribe(updated => {
      if (!updated) {
        this.editAdminError = 'Error al guardar cambios.';
        return;
      }
      this.admin = this.adminService.getCurrentAdmin()!;
      this.appToast.success('Perfil actualizado');
      this.showEditAdminPanel = false;
    });
  }

  loadTareas(): void {
    this.tareaService.getTareasByPais(this.admin.pais).subscribe({
      next: list => {
        this.tareas = list;
        this.filtrarTareas();
      },
      error: () => this.appToast.error('Error al cargar tareas')
    });
  }

  filtrarTareas(): void {
    const q = this.tareaFilter.toLowerCase();
    this.filteredTareas = q
      ? this.tareas.filter(t =>
          t.tarea.toLowerCase().includes(q) ||
          (t.rubro || '').toLowerCase().includes(q) ||
          (t.categoria || '').toLowerCase().includes(q)
        )
      : [...this.tareas];
  }

  abrirNuevaTarea(): void {
    this.tareaEditingId = null;
    this.tareaSubmitted = false;
    this.tareaForm = { tarea: '', descripcion: '', costo: 0, rubro: '', categoria: '', area: 1, descuento: 0 };
    this.showTareaForm = true;
  }

  tareaEditar(t: Tarea): void {
    this.tareaEditingId = t.id ?? null;
    this.tareaSubmitted = false;
    this.tareaForm = {
      tarea: t.tarea,
      descripcion: t.descripcion,
      costo: t.costo,
      rubro: t.rubro,
      categoria: t.categoria,
      area: t.area,
      descuento: t.descuento
    };
    this.showTareaForm = true;
    setTimeout(() => document.getElementById('tarea-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  tareaGuardar(): void {
    this.tareaSubmitted = true;
    if (!this.tareaForm.tarea.trim()) {
      this.appToast.warning('El nombre es obligatorio', 'Campo requerido');
      return;
    }
    if (!this.tareaForm.costo || this.tareaForm.costo <= 0) {
      this.appToast.warning('El costo debe ser mayor a 0', 'Campo requerido');
      return;
    }

    const payload: Tarea = {
      ...this.tareaForm,
      tarea: this.tareaForm.tarea.trim(),
      pais: this.admin.pais
    };

    if (this.tareaEditingId != null) {
      this.tareaService.actualizarTarea(this.tareaEditingId, payload).subscribe({
        next: updated => {
          const idx = this.tareas.findIndex(t => t.id === this.tareaEditingId);
          if (idx !== -1) this.tareas[idx] = updated;
          this.filtrarTareas();
          this.appToast.success(`"${updated.tarea}" actualizada`);
          this.tareaReset();
        },
        error: () => this.appToast.error('Error al actualizar la tarea')
      });
    } else {
      this.tareaService.agregarTarea(payload).subscribe({
        next: created => {
          this.tareas = [...this.tareas, created];
          this.filtrarTareas();
          this.appToast.success(`"${created.tarea}" creada`);
          this.tareaReset();
        },
        error: () => this.appToast.error('Error al crear la tarea')
      });
    }
  }

  tareaEliminar(t: Tarea): void {
    if (t.id == null) return;
    this.uiDialog.confirmDelete(t.tarea).then(confirmed => {
      if (!confirmed) return;
      this.tareaService.eliminarTarea(t.id!).subscribe({
        next: () => {
          this.tareas = this.tareas.filter(x => x.id !== t.id);
          this.filtrarTareas();
          this.appToast.success(`"${t.tarea}" eliminada`);
        },
        error: () => this.appToast.error('Error al eliminar la tarea')
      });
    });
  }

  tareaReset(): void {
    this.tareaEditingId = null;
    this.tareaSubmitted = false;
    this.showTareaForm = false;
    this.tareaForm = { tarea: '', descripcion: '', costo: 0, rubro: '', categoria: '', area: 1, descuento: 0 };
  }
}
