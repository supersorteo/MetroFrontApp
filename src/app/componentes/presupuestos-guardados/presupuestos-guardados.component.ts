import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Cliente } from '../../servicios/cliente.service';
import { Empresa } from '../../servicios/empresa.service';
import { BudgetService, SavedPresupuesto } from '../../servicios/budget.service';
import { UserTarea } from '../../servicios/user-tarea.service';
import { OfflineLocalStoreService } from '../../servicios/offline-local-store.service';
import { AppToastService } from '../../servicios/app-toast.service';
import { UiDialogService } from '../../core/services/ui-dialog.service';

declare const html2pdf: any;

@Component({
  selector: 'app-presupuestos-guardados',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './presupuestos-guardados.component.html',
  styleUrl: './presupuestos-guardados.component.scss'
})
export class PresupuestosGuardadosComponent implements OnInit, OnChanges {
  @Input() tareasActuales: UserTarea[] = [];
  @Input() clienteActual: Cliente | null = null;
  @Input() empresaActual: Empresa | null = null;
  @Input() tareasDelCliente: UserTarea[] = [];
  @Input() presupuestoCargado: SavedPresupuesto | null = null;

  @Output() cargarPresupuesto = new EventEmitter<SavedPresupuesto>();
  @Output() presupuestoEliminado = new EventEmitter<SavedPresupuesto>();
  @Output() presupuestoActualizado = new EventEmitter<SavedPresupuesto>();

  nombreTemporal = '';
  filtro = '';
  maxItems = 30;
  presupuestos: SavedPresupuesto[] = [];
  presupuestoEditando: SavedPresupuesto | null = null;
  tareaAAgregarId: number | null = null;
  presupuestoHabilitadoParaActualizarId: number | null = null;
  showEditModal = false;
  isSavingBudget = false;
  isConfirmingBudgetEdit = false;
  isAddingBudgetTask = false;
  private lastBudgetToastKey: string | null = null;
  private lastBudgetToastAt = 0;
  private lastBudgetActionKey: string | null = null;
  private lastBudgetActionAt = 0;

  constructor(
    private appToast: AppToastService,
    private uiDialog: UiDialogService,
    private budgetService: BudgetService,
    private router: Router,
    private localStore: OfflineLocalStoreService
  ) {}

  ngOnInit(): void {
    this.budgetService.presupuestos$.subscribe(presupuestos => {
      this.presupuestos = presupuestos;
    });
    if (this.clienteActual?.id) {
      this.cargarPresupuestos();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const relevantChange = changes['clienteActual'] || changes['empresaActual'];
    if (relevantChange) {
      if (this.clienteActual?.id) {
        this.cargarPresupuestos();
      } else {
        this.budgetService.limpiarPresupuestos();
      }
    }

    if (this.presupuestoCargado) {
      this.nombreTemporal = this.presupuestoCargado.name || '';
      if (this.presupuestoCargado.cliente?.id !== this.clienteActual?.id) {
        this.presupuestoHabilitadoParaActualizarId = null;
      }
    } else {
      this.presupuestoHabilitadoParaActualizarId = null;
    }
  }

  cargarPresupuestos(): void {
    if (!this.clienteActual?.id) return;
    this.budgetService.cargarPresupuestosPorCliente(this.clienteActual.id).subscribe({
      next: () => {},
      error: () => {
        console.error('%cFallo la carga de presupuestos', 'color: #F44336');
        this.appToast.error('No se pudieron cargar los presupuestos de este cliente.');
      }
    });
  }

  guardarPresupuestoActual(): void {
    if (this.isSavingBudget) return;

    if (localStorage.getItem('trialMode') === 'true') {
      this.uiDialog.info({ title: 'Modo demo', text: 'Guardar presupuestos no está habilitado en el modo de prueba.' });
      return;
    }

    if (!this.clienteActual?.id) { this.appToast.error('Selecciona un cliente'); return; }
    if (this.tareasActuales.length === 0) { this.appToast.error('Agrega tareas al presupuesto'); return; }

    const nombre = this.nombreTemporal.trim();
    if (!nombre) { this.appToast.error('El nombre del presupuesto es obligatorio'); return; }
    if (this.nombreYaExiste(nombre)) { this.appToast.error('Ya existe un presupuesto con este nombre. Elige otro.'); return; }

    const payload = {
      name: nombre,
      cliente: { id: this.clienteActual.id },
      tareas: this.tareasActuales.map(t => ({ id: t.id }))
    };

    if (this.presupuestoCargado?.id) {
      if (!this.puedeActualizarPresupuestoCargado) {
        this.showBudgetInfo('Debes cargar este presupuesto desde la lista para habilitar la actualización.', 'Actualización deshabilitada');
        return;
      }
      this.isSavingBudget = true;
      this.budgetService.updatePresupuesto(this.presupuestoCargado.id, payload).subscribe({
        next: (actualizado) => {
          this.isSavingBudget = false;
          this.presupuestoCargado = actualizado;
          this.presupuestoHabilitadoParaActualizarId = actualizado.id;
          this.presupuestoActualizado.emit(actualizado);
          this.notifyBudgetSaved('actualizado', actualizado);
        },
        error: (err) => {
          this.isSavingBudget = false;
          this.uiDialog.error({ title: 'Error al actualizar', text: err.error?.error || 'No se pudo actualizar el presupuesto.' });
        }
      });
      return;
    }

    this.isSavingBudget = true;
    this.budgetService.guardarPresupuesto(payload).subscribe({
      next: (nuevo) => {
        this.isSavingBudget = false;
        this.nombreTemporal = '';
        this.notifyBudgetSaved('guardado', nuevo);
      },
      error: (err) => {
        this.isSavingBudget = false;
        this.uiDialog.error({ title: 'Error al guardar', text: err.error?.error || 'No se pudo guardar el presupuesto.' });
      }
    });
  }

  cargar(presupuesto: SavedPresupuesto): void {
    if (this.shouldSkipBudgetAction('load', presupuesto.id)) return;
    this.presupuestoHabilitadoParaActualizarId = presupuesto.id;
    this.cargarPresupuesto.emit(presupuesto);
    this.uiDialog.success({ title: 'Listo', text: `Presupuesto "${presupuesto.name}" cargado correctamente.` });
  }

  async eliminar(presupuesto: SavedPresupuesto): Promise<void> {
    if (!presupuesto.id) return;
    const confirmed = await this.uiDialog.confirmDelete(
      presupuesto.name,
      `¿Seguro que querés eliminar "${presupuesto.name}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;
    this.budgetService.eliminarPresupuesto(presupuesto.id).subscribe({
      next: () => { this.notifyBudgetDeleted(presupuesto); this.presupuestoEliminado.emit(presupuesto); },
      error: () => this.uiDialog.error({ title: 'Error al eliminar', text: 'No se pudo eliminar el presupuesto.' })
    });
  }

  editarPresupuesto(presupuesto: SavedPresupuesto): void {
    if (!this.esPresupuestoCargado(presupuesto)) {
      this.showBudgetInfo('Debe cargar este presupuesto para poder editarlo.', 'Cargar presupuesto');
      return;
    }
    this.presupuestoEditando = {
      ...presupuesto,
      cliente: {
        ...presupuesto.cliente,
        name: presupuesto.cliente?.name || this.clienteActual?.name || ''
      },
      tareas: presupuesto.tareas ? [...presupuesto.tareas] : []
    };
    this.tareaAAgregarId = null;
    this.showEditModal = true;
  }

  cancelarEdicion(): void {
    this.showEditModal = false;
    this.presupuestoEditando = null;
    this.tareaAAgregarId = null;
  }

  quitarTareaEdicion(index: number): void {
    if (this.presupuestoEditando) {
      this.presupuestoEditando.tareas.splice(index, 1);
    }
  }

  async confirmarQuitarTarea(index: number): Promise<void> {
    const tarea = this.presupuestoEditando?.tareas[index];
    const confirmed = await this.uiDialog.confirmDelete(
      tarea?.tarea || 'esta tarea',
      `¿Quitar "${tarea?.tarea}" del presupuesto?`
    );
    if (confirmed) this.quitarTareaEdicion(index);
  }

  confirmarEdicion(): void {
    if (this.isConfirmingBudgetEdit) return;
    if (!this.presupuestoEditando || !this.presupuestoEditando.name?.trim()) {
      this.appToast.error('El nombre es obligatorio');
      return;
    }

    const count = this.presupuestoEditando.tareas.length;
    this.uiDialog.confirm({
      title: '¿Guardar cambios?',
      text: `Se actualizará "${this.presupuestoEditando.name}" con ${count} tarea${count !== 1 ? 's' : ''}.`,
      confirmText: 'Guardar cambios',
      cancelText: 'Cancelar',
      tone: 'primary',
      icon: 'question'
    }).then(confirmed => {
      if (!confirmed) return;

      const payload = {
        name: this.presupuestoEditando!.name.trim(),
        cliente: { id: this.presupuestoEditando!.cliente.id },
        tareas: this.presupuestoEditando!.tareas.map(t => ({ id: t.id }))
      };

      this.isConfirmingBudgetEdit = true;
      this.budgetService.updatePresupuesto(this.presupuestoEditando!.id, payload).subscribe({
        next: (actualizado) => {
          console.debug('[budgets] update from edit modal', actualizado.id, actualizado.name);
          this.isConfirmingBudgetEdit = false;
          this.presupuestoEditando = actualizado;
          this.presupuestoActualizado.emit(actualizado);
          this.notifyBudgetSaved('actualizado', actualizado);
          this.showEditModal = false;
        },
        error: (err) => {
          this.isConfirmingBudgetEdit = false;
          console.error('%cERROR AL ACTUALIZAR', 'color: #F44336', err);
          this.uiDialog.error({ title: 'Error al actualizar', text: err.error?.error || 'No se pudo actualizar el presupuesto.' });
        }
      });
    });
  }

  get tareasDisponiblesParaAgregar(): UserTarea[] {
    if (!this.presupuestoEditando || !this.tareasDelCliente) return [];
    const idsActuales = this.presupuestoEditando.tareas.map(t => t.id);
    return this.tareasDelCliente.filter(t => !idsActuales.includes(t.id));
  }

  agregarTareaAlPresupuesto(): void {
    if (!this.tareaAAgregarId || !this.presupuestoEditando) return;
    const tarea = this.tareasDisponiblesParaAgregar.find(item => item.id === this.tareaAAgregarId);
    if (!tarea) { this.appToast.error('La tarea seleccionada ya no está disponible.'); return; }
    this.presupuestoEditando = {
      ...this.presupuestoEditando,
      tareas: [...this.presupuestoEditando.tareas, { ...tarea }]
    };
    this.tareaAAgregarId = null;
  }

  onTareaSeleccionadaChange(): void {}

  // ── Computed ──────────────────────────────────────────────

  get totalGuardados(): number { return this.presupuestos.length; }

  get puedeGuardar(): boolean { return this.tareasActuales.length > 0 && this.totalGuardados < this.maxItems; }

  get puedeGuardarr(): boolean {
    const nombreValido = this.nombreTemporal.trim().length > 0;
    const nombreUnico = !this.nombreYaExiste(this.nombreTemporal);
    return this.tareasActuales.length > 0 && nombreValido && nombreUnico;
  }

  get tienePresupuestoCargado(): boolean { return !!this.presupuestoCargado?.id; }

  get puedeActualizarPresupuestoCargado(): boolean {
    return this.tienePresupuestoCargado
      && this.presupuestoHabilitadoParaActualizarId === this.presupuestoCargado?.id
      && this.puedeGuardarr;
  }

  get puedeEjecutarAccionPrincipal(): boolean {
    return this.tienePresupuestoCargado ? this.puedeActualizarPresupuestoCargado : this.puedeGuardarr;
  }

  get isOffline(): boolean { return !navigator.onLine; }

  get limiteAlcanzado(): boolean { return this.totalGuardados >= this.maxItems; }

  get presupuestosFiltrados(): SavedPresupuesto[] {
    if (!this.filtro?.trim()) return this.presupuestos;
    const termino = this.filtro.toLowerCase();
    return this.presupuestos.filter(p =>
      p.name.toLowerCase().includes(termino) ||
      p.cliente?.name?.toLowerCase().includes(termino)
    );
  }

  nombreYaExiste(nombre: string): boolean {
    if (!nombre.trim()) return false;
    const nombreLower = nombre.trim().toLowerCase();
    if (this.presupuestoCargado && this.presupuestoCargado.name?.toLowerCase() === nombreLower) return false;
    return this.presupuestosFiltrados.some(p => p.name.toLowerCase() === nombreLower);
  }

  getMensajeBotonDeshabilitado(): string {
    if (this.tienePresupuestoCargado && this.presupuestoHabilitadoParaActualizarId !== this.presupuestoCargado?.id)
      return 'Carga el presupuesto desde la lista para habilitar la actualización';
    if (this.tareasActuales.length === 0) return 'Agrega tareas para guardar';
    if (!this.nombreTemporal.trim()) return 'Ingresa un nombre para el presupuesto';
    if (this.nombreYaExiste(this.nombreTemporal)) return 'Nombre ya utilizado';
    return 'Guardar presupuesto';
  }

  esPendienteDeSync(presupuesto: SavedPresupuesto | null | undefined): boolean { return Number(presupuesto?.id) < 0; }

  esPresupuestoCargado(presupuesto: SavedPresupuesto | null | undefined): boolean {
    return Number(presupuesto?.id) > 0 && Number(this.presupuestoCargado?.id) === Number(presupuesto?.id);
  }

  // ── PDF ────────────────────────────────────────────────────

  async descargarPDF(presupuesto: SavedPresupuesto): Promise<void> {
    const printable = this.buildPrintableDocument(presupuesto);
    document.body.appendChild(printable);
    try {
      await html2pdf()
        .set({ margin: 10, filename: `${presupuesto.name}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } })
        .from(printable).save();
    } catch (error) {
      console.error('Error al generar PDF', error);
      this.appToast.error('No se pudo descargar el PDF');
    } finally {
      document.body.removeChild(printable);
    }
  }

  async verPresupuesto(presupuesto: SavedPresupuesto): Promise<void> {
    const preview = { presupuesto, empresa: presupuesto.empresa || this.empresaActual, cliente: presupuesto.cliente, tareas: presupuesto.tareas, name: presupuesto.name, budgetDate: presupuesto.createdAt };
    await this.localStore.setState('budget:active-preview', preview);
    localStorage.setItem('selectedEmpresa', JSON.stringify(preview.empresa));
    localStorage.setItem('selectedCliente', JSON.stringify(preview.cliente));
    localStorage.setItem('selectedTareas', JSON.stringify(preview.tareas));
    localStorage.setItem('selectedPresupuestoName', preview.name);
    this.router.navigate(['/presupuesto']);
  }

  // ── Private helpers ────────────────────────────────────────

  private notifyBudgetSaved(action: 'guardado' | 'actualizado', presupuesto: SavedPresupuesto): void {
    if (this.shouldSkipBudgetAction(action, presupuesto.id)) return;
    if (this.esPendienteDeSync(presupuesto)) {
      this.showBudgetInfo(`Presupuesto ${action} localmente. Se sincronizará cuando vuelva la conexión.`, 'Guardado offline');
      return;
    }
    this.uiDialog.success({ title: 'Listo', text: `Presupuesto ${action} correctamente.` });
  }

  private notifyBudgetDeleted(presupuesto: SavedPresupuesto): void {
    if (this.esPendienteDeSync(presupuesto) || this.isOffline) {
      this.showBudgetInfo('Presupuesto eliminado localmente. El cambio se sincronizará cuando vuelva la conexión.', 'Eliminado offline');
      return;
    }
    this.uiDialog.success({ title: 'Eliminado', text: 'El presupuesto fue eliminado correctamente.' });
  }

  private showBudgetSuccess(message: string, title?: string): void {
    if (this.shouldSkipBudgetToast('success', message, title)) return;
    this.appToast.success(message, title);
  }

  private showBudgetInfo(message: string, title?: string): void {
    if (this.shouldSkipBudgetToast('info', message, title)) return;
    this.appToast.info(message, title);
  }

  private shouldSkipBudgetToast(type: 'success' | 'info', message: string, title?: string): boolean {
    const now = Date.now();
    const key = `${type}|${title || ''}|${message}`;
    if (this.lastBudgetToastKey === key && now - this.lastBudgetToastAt < 1200) return true;
    this.lastBudgetToastKey = key;
    this.lastBudgetToastAt = now;
    return false;
  }

  private shouldSkipBudgetAction(action: 'load' | 'guardado' | 'actualizado', presupuestoId: number | null | undefined): boolean {
    const now = Date.now();
    const key = `${action}|${Number(presupuestoId) || 0}`;
    if (this.lastBudgetActionKey === key && now - this.lastBudgetActionAt < 2000) return true;
    this.lastBudgetActionKey = key;
    this.lastBudgetActionAt = now;
    return false;
  }

  private buildPrintableDocument(presupuesto: SavedPresupuesto): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '16px';
    wrapper.innerHTML = `
      <h2 style="margin-bottom:8px;">${presupuesto.name}</h2>
      <p><strong>Creado:</strong> ${new Date(presupuesto.createdAt).toLocaleString()}</p>
      <p><strong>Cliente:</strong> ${presupuesto.cliente?.name || 'Sin cliente'}</p>
      <table style="width:100%; border-collapse: collapse; margin-top:16px;">
        <thead><tr>
          <th style="border:1px solid #0d6efd; padding:6px; text-align:left;">Tarea</th>
          <th style="border:1px solid #0d6efd; padding:6px; text-align:right;">Área</th>
          <th style="border:1px solid #0d6efd; padding:6px; text-align:right;">Costo</th>
          <th style="border:1px solid #0d6efd; padding:6px; text-align:right;">Total</th>
        </tr></thead>
        <tbody>${presupuesto.tareas.map(t => `
          <tr>
            <td style="border:1px solid #ccc; padding:6px;">${t.tarea}</td>
            <td style="border:1px solid #ccc; padding:6px; text-align:right;">${t.area?.toFixed(2) || '0.00'}</td>
            <td style="border:1px solid #ccc; padding:6px; text-align:right;">$${t.costo?.toFixed(2) || '0.00'}</td>
            <td style="border:1px solid #ccc; padding:6px; text-align:right;">$${(t.totalCost || 0).toFixed(2)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr>
          <td colspan="3" style="border:1px solid #0d6efd; padding:6px; text-align:right; font-weight:bold;">Total</td>
          <td style="border:1px solid #0d6efd; padding:6px; text-align:right; font-weight:bold;">$${this.calcularTotal(presupuesto).toFixed(2)}</td>
        </tr></tfoot>
      </table>`;
    return wrapper;
  }

  private calcularTotal(presupuesto: SavedPresupuesto): number {
    return presupuesto.tareas.reduce((acc, t) => acc + (t.totalCost || 0), 0);
  }
}
