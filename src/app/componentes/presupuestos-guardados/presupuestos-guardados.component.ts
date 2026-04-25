import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { Cliente } from '../../servicios/cliente.service';
import { Empresa } from '../../servicios/empresa.service';
import { BudgetService, SavedPresupuesto } from '../../servicios/budget.service';
import { UserTarea } from '../../servicios/user-tarea.service';
import { OfflineLocalStoreService } from '../../servicios/offline-local-store.service';

declare const html2pdf: any;
declare const bootstrap: any;

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

  constructor(
    private toastr: ToastrService,
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

  ngOnChanges(): void {
    if (this.clienteActual?.id) {
      this.cargarPresupuestos();
    }

    if (this.presupuestoCargado) {
      this.nombreTemporal = this.presupuestoCargado.name || '';
    }
  }

  cargarPresupuestos(): void {
    if (!this.clienteActual?.id) {
      return;
    }

    this.budgetService.cargarPresupuestosPorCliente(this.clienteActual.id).subscribe({
      next: () => {},
      error: () => {
        console.error('%cFallo la carga de presupuestos', 'color: #F44336');
        this.toastr.error('No se pudieron cargar los presupuestos de este cliente.');
      }
    });
  }

  guardarPresupuestoActual(): void {
    if (localStorage.getItem('trialMode') === 'true') {
      Swal.fire({
        icon: 'info',
        title: 'Modo demo',
        text: 'Guardar presupuestos no está habilitado en el modo de prueba.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (!this.clienteActual?.id) {
      this.toastr.error('Selecciona un cliente');
      return;
    }

    if (this.tareasActuales.length === 0) {
      this.toastr.error('Agrega tareas al presupuesto');
      return;
    }

    const nombre = this.nombreTemporal.trim();
    if (!nombre) {
      this.toastr.error('El nombre del presupuesto es obligatorio');
      return;
    }

    if (this.nombreYaExiste(nombre)) {
      this.toastr.error('Ya existe un presupuesto con este nombre. Elige otro.');
      return;
    }

    const payload = {
      name: nombre,
      cliente: { id: this.clienteActual.id },
      tareas: this.tareasActuales.map(t => ({ id: t.id }))
    };

    if (this.presupuestoCargado?.id) {
      this.budgetService.updatePresupuesto(this.presupuestoCargado.id, payload).subscribe({
        next: (actualizado) => {
          this.presupuestoCargado = actualizado;
          this.presupuestoActualizado.emit(actualizado);
          this.notifyBudgetSaved('actualizado', actualizado);
        },
        error: (err) => {
          this.toastr.error(err.error?.error || 'Error al actualizar el presupuesto');
        }
      });
      return;
    }

    this.budgetService.guardarPresupuesto(payload).subscribe({
      next: (nuevo) => {
        this.nombreTemporal = '';
        this.notifyBudgetSaved('guardado', nuevo);
      },
      error: (err) => {
        this.toastr.error(err.error?.error || 'Error al guardar el presupuesto');
      }
    });
  }

  cargar(presupuesto: SavedPresupuesto): void {
    this.cargarPresupuesto.emit(presupuesto);
  }

  async eliminar(presupuesto: SavedPresupuesto): Promise<void> {
    if (!presupuesto.id) {
      return;
    }

    const result = await Swal.fire({
      title: 'Eliminar presupuesto',
      text: `¿Seguro que querés eliminar "${presupuesto.name}"? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    this.budgetService.eliminarPresupuesto(presupuesto.id).subscribe({
      next: () => {
        this.notifyBudgetDeleted(presupuesto);
        this.presupuestoEliminado.emit(presupuesto);
      },
      error: () => this.toastr.error('Error al eliminar')
    });
  }

  get totalGuardados(): number {
    return this.presupuestos.length;
  }

  get puedeGuardar(): boolean {
    return this.tareasActuales.length > 0 && this.totalGuardados < this.maxItems;
  }

  get puedeGuardarr(): boolean {
    const nombreValido = this.nombreTemporal.trim().length > 0;
    const nombreUnico = !this.nombreYaExiste(this.nombreTemporal);
    return this.tareasActuales.length > 0 && nombreValido && nombreUnico;
  }

  get isOffline(): boolean {
    return !navigator.onLine;
  }

  nombreYaExiste(nombre: string): boolean {
    if (!nombre.trim()) {
      return false;
    }

    const nombreLower = nombre.trim().toLowerCase();
    if (this.presupuestoCargado && this.presupuestoCargado.name?.toLowerCase() === nombreLower) {
      return false;
    }

    return this.presupuestosFiltrados.some(p => p.name.toLowerCase() === nombreLower);
  }

  getMensajeBotonDeshabilitado(): string {
    if (this.tareasActuales.length === 0) {
      return 'Agrega tareas para guardar';
    }
    if (!this.nombreTemporal.trim()) {
      return 'Ingresa un nombre para el presupuesto';
    }
    if (this.nombreYaExiste(this.nombreTemporal)) {
      return 'Nombre ya utilizado';
    }
    return 'Guardar presupuesto';
  }

  get limiteAlcanzado(): boolean {
    return this.totalGuardados >= this.maxItems;
  }

  get presupuestosFiltrados(): SavedPresupuesto[] {
    if (!this.filtro?.trim()) {
      return this.presupuestos;
    }

    const termino = this.filtro.toLowerCase();
    return this.presupuestos.filter(p =>
      p.name.toLowerCase().includes(termino) ||
      p.cliente?.name?.toLowerCase().includes(termino)
    );
  }

  async descargarPDF(presupuesto: SavedPresupuesto): Promise<void> {
    const printable = this.buildPrintableDocument(presupuesto);
    document.body.appendChild(printable);

    try {
      await html2pdf()
        .set({
          margin: 10,
          filename: `${presupuesto.name}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .from(printable)
        .save();
    } catch (error) {
      console.error('Error al generar PDF', error);
      this.toastr.error('No se pudo descargar el PDF', 'Error');
    } finally {
      document.body.removeChild(printable);
    }
  }

  async verPresupuesto(presupuesto: SavedPresupuesto): Promise<void> {
    const preview = {
      presupuesto,
      empresa: presupuesto.empresa || this.empresaActual,
      cliente: presupuesto.cliente,
      tareas: presupuesto.tareas,
      name: presupuesto.name,
      budgetDate: presupuesto.createdAt
    };

    await this.localStore.setState('budget:active-preview', preview);
    localStorage.setItem('selectedEmpresa', JSON.stringify(preview.empresa));
    localStorage.setItem('selectedCliente', JSON.stringify(preview.cliente));
    localStorage.setItem('selectedTareas', JSON.stringify(preview.tareas));
    localStorage.setItem('selectedPresupuestoName', preview.name);
    this.router.navigate(['/presupuesto']);
  }

  editarPresupuesto(presupuesto: SavedPresupuesto): void {
    this.presupuestoEditando = {
      ...presupuesto,
      cliente: { ...presupuesto.cliente },
      tareas: presupuesto.tareas ? [...presupuesto.tareas] : []
    };

    const modal = new bootstrap.Modal(document.getElementById('editarPresupuestoModal')!);
    modal.show();
  }

  quitarTareaEdicion(index: number): void {
    if (this.presupuestoEditando) {
      this.presupuestoEditando.tareas.splice(index, 1);
    }
  }

  confirmarEdicion(): void {
    if (!this.presupuestoEditando || !this.presupuestoEditando.name?.trim()) {
      this.toastr.error('El nombre es obligatorio');
      return;
    }

    const payload = {
      name: this.presupuestoEditando.name.trim(),
      cliente: { id: this.presupuestoEditando.cliente.id },
      tareas: this.presupuestoEditando.tareas.map(t => ({ id: t.id }))
    };

    this.budgetService.updatePresupuesto(this.presupuestoEditando.id, payload).subscribe({
      next: (actualizado) => {
        this.presupuestoEditando = actualizado;
        this.presupuestoActualizado.emit(actualizado);
        this.notifyBudgetSaved('actualizado', actualizado);
        bootstrap.Modal.getInstance(document.getElementById('editarPresupuestoModal')!)?.hide();
      },
      error: (err) => {
        console.error('%cERROR AL ACTUALIZAR', 'color: #F44336', err);
        this.toastr.error(err.error?.error || 'Error al actualizar');
      }
    });
  }

  get tareasDisponiblesParaAgregar(): UserTarea[] {
    if (!this.presupuestoEditando || !this.tareasDelCliente) {
      return [];
    }

    const idsActuales = this.presupuestoEditando.tareas.map(t => t.id);
    return this.tareasDelCliente.filter(t => !idsActuales.includes(t.id));
  }

  agregarTareaAlPresupuesto(): void {
    if (!this.tareaAAgregarId || !this.presupuestoEditando) {
      return;
    }

    this.budgetService.agregarTareaAPresupuesto(this.presupuestoEditando.id, this.tareaAAgregarId).subscribe({
      next: (presupuestoActualizado) => {
        this.presupuestoEditando = presupuestoActualizado;
        this.tareaAAgregarId = null;
        this.presupuestoActualizado.emit(presupuestoActualizado);
        this.notifyBudgetSaved('actualizado', presupuestoActualizado);
      },
      error: (err) => {
        this.toastr.error(err.error?.error || 'Error al agregar tarea');
      }
    });
  }

  onTareaSeleccionadaChange(): void {
    if (this.tareaAAgregarId === null) {
      return;
    }
  }

  esPendienteDeSync(presupuesto: SavedPresupuesto | null | undefined): boolean {
    return Number(presupuesto?.id) < 0;
  }

  private notifyBudgetSaved(action: 'guardado' | 'actualizado', presupuesto: SavedPresupuesto): void {
    if (this.esPendienteDeSync(presupuesto)) {
      this.toastr.info(
        `Presupuesto ${action} localmente. Se sincronizará cuando vuelva la conexión.`,
        'Guardado offline'
      );
      return;
    }

    this.toastr.success(`Presupuesto ${action} correctamente`);
  }

  private notifyBudgetDeleted(presupuesto: SavedPresupuesto): void {
    if (this.esPendienteDeSync(presupuesto) || this.isOffline) {
      this.toastr.info(
        'Presupuesto eliminado localmente. El cambio se sincronizará cuando vuelva la conexión.',
        'Eliminado offline'
      );
      return;
    }

    this.toastr.info('Presupuesto eliminado');
  }

  private buildPrintableDocument(presupuesto: SavedPresupuesto): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '16px';
    wrapper.innerHTML = `
      <h2 style="margin-bottom:8px;">${presupuesto.name}</h2>
      <p><strong>Creado:</strong> ${new Date(presupuesto.createdAt).toLocaleString()}</p>
      <p><strong>Cliente:</strong> ${presupuesto.cliente?.name || 'Sin cliente'}</p>
      <table style="width:100%; border-collapse: collapse; margin-top:16px;">
        <thead>
          <tr>
            <th style="border:1px solid #0d6efd; padding:6px; text-align:left;">Tarea</th>
            <th style="border:1px solid #0d6efd; padding:6px; text-align:right;">Área</th>
            <th style="border:1px solid #0d6efd; padding:6px; text-align:right;">Costo</th>
            <th style="border:1px solid #0d6efd; padding:6px; text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${presupuesto.tareas
            .map(
              tarea => `
                <tr>
                  <td style="border:1px solid #ccc; padding:6px;">${tarea.tarea}</td>
                  <td style="border:1px solid #ccc; padding:6px; text-align:right;">${tarea.area?.toFixed(2) || '0.00'}</td>
                  <td style="border:1px solid #ccc; padding:6px; text-align:right;">$${tarea.costo?.toFixed(2) || '0.00'}</td>
                  <td style="border:1px solid #ccc; padding:6px; text-align:right;">$${(tarea.totalCost || 0).toFixed(2)}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="border:1px solid #0d6efd; padding:6px; text-align:right; font-weight:bold;">Total</td>
            <td style="border:1px solid #0d6efd; padding:6px; text-align:right; font-weight:bold;">$${this.calcularTotal(presupuesto).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    `;
    return wrapper;
  }

  private calcularTotal(presupuesto: SavedPresupuesto): number {
    return presupuesto.tareas.reduce((acc, tarea) => acc + (tarea.totalCost || 0), 0);
  }
}
