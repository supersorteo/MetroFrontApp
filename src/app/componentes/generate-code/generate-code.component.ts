import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { UiDialogService } from '../../core/services/ui-dialog.service';
import { AuthService, UserDataSummary } from '../../servicios/auth.service';
import { Admin, AdminMembershipLimits, AdminService } from '../../servicios/admin.service';
import { Tarea, TareaService } from '../../servicios/tarea.service';
import { AjustePrecioService } from '../../servicios/ajuste-precio.service';

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
  disabled?: boolean;
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

  showAjustePreciosPanel = false;
  porcentajeSubirAdmin: number | null = null;
  porcentajeBajarAdmin: number | null = null;
  factorAdmin = 1;

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
    private uiDialog: UiDialogService,
    private ajustePrecioService: AjustePrecioService
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
      error: () => this.uiDialog.error({ title: 'Error', text: 'No se pudieron cargar los códigos.' })
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

  async validateAndGenerateCode(): Promise<void> {
    if (!this.code.trim()) {
      this.uiDialog.warning({ title: 'Campo requerido', text: 'Debe ingresar un código.' });
      return;
    }

    const confirmed = await this.uiDialog.confirm({
      title: 'Agregar código',
      text: `¿Confirmas agregar el código "${this.code.trim()}"?`,
      confirmText: 'Agregar',
      cancelText: 'Cancelar'
    });
    if (!confirmed) return;

    this.authService.agregarCode({ code: this.code, email: null, pais: this.admin.pais }).subscribe({
      next: response => {
        if (response.message === 'Código agregado con éxito') {
          this.uiDialog.success({ title: 'Código agregado', text: response.message });
          this.code = '';
          this.loadCodes();
        } else {
          this.uiDialog.error({ title: 'No se pudo agregar', text: response.message });
        }
      },
      error: err => this.uiDialog.error({ title: 'Error', text: err.message })
    });
  }

  async generateCodes(months: 3 | 6): Promise<void> {
    const count = months === 3 ? this.codeCount3 : this.codeCount6;
    if (count <= 0) {
      this.uiDialog.warning({ title: 'Cantidad inválida', text: 'La cantidad debe ser mayor a 0.' });
      return;
    }

    const plural = count !== 1 ? 's' : '';
    const confirmed = await this.uiDialog.confirm({
      title: `Generar ${count} código${plural}`,
      text: `¿Confirmas generar ${count} código${plural} de ${months} meses?`,
      confirmText: 'Generar',
      cancelText: 'Cancelar'
    });
    if (!confirmed) return;

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
        this.uiDialog.success({ title: 'Códigos generados', text: res.message });
        this.loadCodes();
      },
      error: err => this.uiDialog.error({ title: 'Error al generar', text: err.message })
    });
  }

  randomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  confirmDeleteCode(code: string): void {
    // Paso 1: confirmación simple e inmediata
    this.uiDialog.confirmDelete(code).then(async firstConfirmed => {
      if (!firstConfirmed) return;

      // Paso 2: verificar si el código tiene datos
      this.authService.getUserDataSummary(code).subscribe(async summary => {
        if (!summary || !summary.hasData) {
          // Sin datos — borrar el código directamente
          this.authService.deleteCode(code).subscribe({
            next: () => {
              this.uiDialog.success({ title: 'Código eliminado', text: `El código ${code} fue eliminado correctamente.` });
              this.loadCodes();
            },
            error: () => this.uiDialog.error({ title: 'Error', text: 'No se pudo eliminar el código.' })
          });
        } else {
          // Tiene datos — segundo modal con el detalle
          const secondConfirmed = await this.uiDialog.confirm({
            title: 'Este código tiene datos asociados',
            html: `
              <div style="text-align:left;font-size:14px">
                <p>El código <strong>${code}</strong> pertenece a <strong>${summary.email}</strong> y tiene:</p>
                <ul style="margin:8px 0 12px 16px;line-height:1.8">
                  <li>${summary.empresas} empresa${summary.empresas !== 1 ? 's' : ''}</li>
                  <li>${summary.clientes} cliente${summary.clientes !== 1 ? 's' : ''}</li>
                  <li>${summary.presupuestos} presupuesto${summary.presupuestos !== 1 ? 's' : ''}</li>
                  <li>${summary.tareasPersonalizadas} tarea${summary.tareasPersonalizadas !== 1 ? 's' : ''} personalizada${summary.tareasPersonalizadas !== 1 ? 's' : ''}</li>
                </ul>
                <p style="color:#dc3545;font-weight:600">Todo esto se eliminará de forma permanente. Esta acción no se puede deshacer.</p>
              </div>`,
            confirmText: 'Sí, eliminar todo',
            cancelText: 'Cancelar',
            tone: 'danger',
            icon: 'warning'
          });
          if (!secondConfirmed) return;
          this.authService.deleteUserData(code).subscribe({
            next: () => {
              this.uiDialog.success({ title: 'Cuenta eliminada', text: `El código ${code} y todos sus datos fueron eliminados. El slot queda disponible para reasignar.` });
              this.loadCodes();
            },
            error: () => this.uiDialog.error({ title: 'Error', text: 'No se pudieron eliminar todos los datos. Intentá de nuevo.' })
          });
        }
      });
    });
  }

  toggleDisableCode(item: AccessCode): void {
    const action = item.disabled ? 'reactivar' : 'desactivar';
    const actionText = item.disabled ? 'reactivará' : 'desactivará';
    const icon = item.disabled ? 'question' : 'warning';
    this.uiDialog.confirm({
      title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} el código ${item.code}?`,
      text: item.disabled
        ? `El usuario ${item.email} podrá volver a iniciar sesión.`
        : `El usuario ${item.email} no podrá iniciar sesión hasta que lo reactives. Sus datos se conservan.`,
      confirmText: `Sí, ${action}`,
      cancelText: 'Cancelar',
      tone: item.disabled ? 'primary' : 'warning',
      icon
    }).then(confirmed => {
      if (!confirmed) return;
      const obs = item.disabled
        ? this.authService.enableCode(item.code)
        : this.authService.disableCode(item.code);
      obs.subscribe({
        next: res => {
          item.disabled = res.disabled;
          this.uiDialog.success({
            title: item.disabled ? 'Código desactivado' : 'Código reactivado',
            text: item.disabled
              ? `El código ${item.code} fue desactivado. El usuario no puede iniciar sesión.`
              : `El código ${item.code} fue reactivado correctamente.`
          });
        },
        error: () => this.uiDialog.error({ title: 'Error', text: `No se pudo ${action} el código.` })
      });
    });
  }

  copyToClipboard(code: string): void {
    navigator.clipboard.writeText(code).then(
      () => this.uiDialog.success({ title: 'Copiado', text: `El código ${code} fue copiado al portapapeles.` }),
      () => this.uiDialog.error({ title: 'Error', text: 'No se pudo copiar el código.' })
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
      error: () => this.uiDialog.error({ title: 'Error', text: 'No se pudieron cargar los límites de membresía.' })
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

  async saveLimits(): Promise<void> {
    if (!this.limitsDraft?.id) {
      this.uiDialog.error({ title: 'Error', text: 'No se pudo identificar la configuración a actualizar.' });
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
      this.uiDialog.warning({ title: 'Valores inválidos', text: 'Todos los límites deben ser números válidos mayores o iguales a 0.' });
      return;
    }

    const confirmed = await this.uiDialog.confirm({
      title: 'Guardar límites',
      text: '¿Confirmas guardar los cambios en los límites de membresía?',
      confirmText: 'Guardar',
      cancelText: 'Cancelar'
    });
    if (!confirmed) return;

    this.limitsSaving = true;
    this.adminService.updateLimits(this.limitsDraft.id, this.limitsDraft).subscribe({
      next: updated => {
        this.limitsSaving = false;
        if (!updated) {
          this.uiDialog.error({ title: 'Error', text: 'No se pudieron actualizar los límites.' });
          return;
        }
        this.membershipLimits = updated;
        this.uiDialog.success({ title: 'Límites actualizados', text: 'Los límites de membresía fueron guardados correctamente.' });
        this.closeLimitsPanel();
      },
      error: () => {
        this.limitsSaving = false;
        this.uiDialog.error({ title: 'Error', text: 'No se pudieron guardar los límites.' });
      }
    });
  }

  async saveAdminChanges(): Promise<void> {
    if (!this.editAdminUsername.trim()) {
      this.editAdminError = 'El usuario no puede estar vacío.';
      return;
    }

    const confirmed = await this.uiDialog.confirm({
      title: 'Guardar perfil',
      text: '¿Confirmas guardar los cambios del perfil de administrador?',
      confirmText: 'Guardar',
      cancelText: 'Cancelar'
    });
    if (!confirmed) return;

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
      this.uiDialog.success({ title: 'Perfil actualizado', text: 'Los cambios del perfil fueron guardados correctamente.' });
      this.showEditAdminPanel = false;
    });
  }

  loadTareas(): void {
    this.tareaService.getTareasByPais(this.admin.pais).subscribe({
      next: list => {
        const factor = this.ajustePrecioService.getAdminFactorLocal(this.admin.pais);
        this.factorAdmin = factor;
        this.tareas = factor !== 1
          ? list.map(t => ({ ...t, costo: t.costo * factor }))
          : list;
        this.ajustePrecioService.syncAdminFactor(this.admin.pais);
        this.filtrarTareas();
      },
      error: () => this.uiDialog.error({ title: 'Error', text: 'No se pudieron cargar las tareas.' })
    });
  }

  get factorAdminDisplay(): string {
    if (this.factorAdmin === 1) return 'Sin ajuste';
    const pct = (this.factorAdmin - 1) * 100;
    return pct > 0 ? `+${pct.toFixed(4)}%` : `${pct.toFixed(4)}%`;
  }

  async ajustarPreciosAdmin(): Promise<void> {
    const porcentaje = parseFloat(String(this.porcentajeSubirAdmin));
    if (isNaN(porcentaje) || porcentaje <= 0 || porcentaje > 500) {
      this.uiDialog.warning({ title: 'Valor inválido', text: 'Ingresá un porcentaje entre 0.01 y 500.' });
      return;
    }
    if (!this.tareas.length) {
      this.uiDialog.warning({ title: 'Sin tareas', text: 'No hay tareas en el catálogo para ajustar.' });
      return;
    }
    const confirmed = await this.uiDialog.confirm({
      title: `Subir precios ${porcentaje}%`,
      text: `Los precios del catálogo de ${this.admin.pais} se incrementarán un ${porcentaje}% para todos los usuarios. ¿Confirmas?`,
      confirmText: 'Sí, subir',
      cancelText: 'Cancelar',
      tone: 'primary',
      icon: 'question'
    });
    if (!confirmed) return;
    const delta = 1 + porcentaje / 100;
    this.tareas = this.tareas.map(t => ({ ...t, costo: t.costo * delta }));
    this.factorAdmin = Math.round(this.factorAdmin * delta * 1_000_000) / 1_000_000;
    this.filtrarTareas();
    this.ajustePrecioService.aplicarAjusteAdmin(this.admin.pais, 'subir', porcentaje);
    this.porcentajeSubirAdmin = null;
    this.uiDialog.success({ title: 'Lista actualizada', text: `Precios del catálogo incrementados en ${porcentaje}% para todos los usuarios de ${this.admin.pais}.` });
  }

  async disminuirPreciosAdmin(): Promise<void> {
    const porcentaje = parseFloat(String(this.porcentajeBajarAdmin));
    if (isNaN(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
      this.uiDialog.warning({ title: 'Valor inválido', text: 'Ingresá un porcentaje entre 0.01 y 100.' });
      return;
    }
    if (!this.tareas.length) {
      this.uiDialog.warning({ title: 'Sin tareas', text: 'No hay tareas en el catálogo para ajustar.' });
      return;
    }
    const confirmed = await this.uiDialog.confirm({
      title: `Bajar precios ${porcentaje}%`,
      text: `Los precios del catálogo de ${this.admin.pais} se reducirán un ${porcentaje}% para todos los usuarios. ¿Confirmas?`,
      confirmText: 'Sí, bajar',
      cancelText: 'Cancelar',
      tone: 'warning',
      icon: 'warning'
    });
    if (!confirmed) return;
    const delta = 1 - porcentaje / 100;
    this.tareas = this.tareas.map(t => ({ ...t, costo: t.costo * delta }));
    this.factorAdmin = Math.round(this.factorAdmin * delta * 1_000_000) / 1_000_000;
    this.filtrarTareas();
    this.ajustePrecioService.aplicarAjusteAdmin(this.admin.pais, 'bajar', porcentaje);
    this.porcentajeBajarAdmin = null;
    this.uiDialog.success({ title: 'Lista actualizada', text: `Precios del catálogo reducidos en ${porcentaje}% para todos los usuarios de ${this.admin.pais}.` });
  }

  async reestablecerPreciosAdmin(): Promise<void> {
    const confirmed = await this.uiDialog.confirm({
      title: 'Restablecer precios',
      text: `Se eliminarán todos los ajustes activos y los precios del catálogo de ${this.admin.pais} volverán a sus valores originales para todos los usuarios. ¿Confirmas?`,
      confirmText: 'Sí, restablecer',
      cancelText: 'Cancelar',
      tone: 'warning',
      icon: 'warning'
    });
    if (!confirmed) return;
    this.ajustePrecioService.aplicarAjusteAdmin(this.admin.pais, 'reestablecer');
    this.factorAdmin = 1;
    this.showAjustePreciosPanel = false;
    this.loadTareas();
    this.uiDialog.success({ title: 'Precios restablecidos', text: `Se restauraron los precios originales del catálogo para todos los usuarios de ${this.admin.pais}.` });
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

  async tareaGuardar(): Promise<void> {
    this.tareaSubmitted = true;
    if (!this.tareaForm.tarea.trim()) {
      this.uiDialog.warning({ title: 'Campo requerido', text: 'El nombre de la tarea es obligatorio.' });
      return;
    }
    if (!this.tareaForm.costo || this.tareaForm.costo <= 0) {
      this.uiDialog.warning({ title: 'Campo requerido', text: 'El costo debe ser mayor a 0.' });
      return;
    }

    const isEditing = this.tareaEditingId != null;
    const confirmed = await this.uiDialog.confirm({
      title: isEditing ? 'Actualizar tarea' : 'Crear tarea',
      text: isEditing
        ? `¿Confirmas actualizar "${this.tareaForm.tarea.trim()}"?`
        : `¿Confirmas agregar "${this.tareaForm.tarea.trim()}" al catálogo?`,
      confirmText: isEditing ? 'Actualizar' : 'Crear',
      cancelText: 'Cancelar'
    });
    if (!confirmed) return;

    const payload: Tarea = {
      ...this.tareaForm,
      tarea: this.tareaForm.tarea.trim(),
      pais: this.admin.pais
    };

    if (this.tareaEditingId != null) {
      this.tareaService.actualizarTarea(this.tareaEditingId, payload).subscribe({
        next: updated => {
          this.uiDialog.success({ title: 'Tarea actualizada', text: `"${updated.tarea}" fue actualizada correctamente.` });
          this.tareaReset();
          this.tareaService.invalidatePaisCache(this.admin.pais);
          this.loadTareas();
        },
        error: () => this.uiDialog.error({ title: 'Error', text: 'No se pudo actualizar la tarea.' })
      });
    } else {
      this.tareaService.agregarTarea(payload).subscribe({
        next: created => {
          this.uiDialog.success({ title: 'Tarea creada', text: `"${created.tarea}" fue agregada al catálogo.` });
          this.tareaReset();
          this.tareaService.invalidatePaisCache(this.admin.pais);
          this.loadTareas();
        },
        error: () => this.uiDialog.error({ title: 'Error', text: 'No se pudo crear la tarea.' })
      });
    }
  }

  tareaEliminar(t: Tarea): void {
    if (t.id == null) return;
    this.uiDialog.confirmDelete(t.tarea).then(confirmed => {
      if (!confirmed) return;
      this.tareaService.eliminarTarea(t.id!).subscribe({
        next: () => {
          this.uiDialog.success({ title: 'Tarea eliminada', text: `"${t.tarea}" fue eliminada del catálogo.` });
          this.tareaService.invalidatePaisCache(this.admin.pais);
          this.loadTareas();
        },
        error: () => this.uiDialog.error({ title: 'Error', text: 'No se pudo eliminar la tarea.' })
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
