import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Cliente } from '../../servicios/cliente.service';
import { Empresa } from '../../servicios/empresa.service';
import { UserTarea } from '../../servicios/user-tarea.service';
import { BudgetStorageService, SavedPresupuesto } from '../../servicios/budget-storage.service';
import { ToastrService } from 'ngx-toastr';

declare const html2pdf: any;

@Component({
  selector: 'app-presupuestos-guardados',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './presupuestos-guardados.component.html',
  styleUrl: './presupuestos-guardados.component.scss'
})
export class PresupuestosGuardadosComponent {
  @Input() tareasActuales: UserTarea[] = [];
  @Input() clienteActual: Cliente | null = null;
  @Input() empresaActual: Empresa | null = null;
  @Output() cargarPresupuesto = new EventEmitter<SavedPresupuesto>();

  nombreTemporal = '';
  filtro = '';
  presupuestos$ = this.budgetStorageService.budgets$;
  maxItems = this.budgetStorageService.maxItems;

  constructor(
    private budgetStorageService: BudgetStorageService,
    private toastr: ToastrService
  ) {}

  get totalGuardados(): number {
    return this.budgetStorageService.currentBudgets.length;
  }

  get puedeGuardar(): boolean {
    return !!this.tareasActuales?.length && this.totalGuardados < this.maxItems;
  }

  get limiteAlcanzado(): boolean {
    return this.totalGuardados >= this.maxItems;
  }

  guardarPresupuestoActual() {
    const nombre = this.nombreTemporal.trim() || `Presupuesto ${new Date().toLocaleDateString()}`;

    const resultado = this.budgetStorageService.addBudget({
      name: nombre,
      cliente: this.clienteActual,
      empresa: this.empresaActual,
      tareas: JSON.parse(JSON.stringify(this.tareasActuales || []))
    });

    if (!resultado.ok) {
      this.toastr.error(resultado.error || 'No se pudo guardar el presupuesto', 'Error');
      return;
    }

    this.toastr.success('Presupuesto guardado correctamente', nombre);
    this.nombreTemporal = '';
  }

  cargar(presupuesto: SavedPresupuesto) {
    this.cargarPresupuesto.emit(presupuesto);
  }

  eliminar(presupuesto: SavedPresupuesto) {
    this.budgetStorageService.removeBudget(presupuesto.id);
    this.toastr.info('Presupuesto eliminado', presupuesto.name);
  }

  get presupuestosFiltrados(): SavedPresupuesto[] {
    const termino = this.filtro.trim().toLowerCase();
    if (!termino) {
      return this.budgetStorageService.currentBudgets;
    }
    return this.budgetStorageService.currentBudgets.filter(presupuesto => {
      return (
        presupuesto.name.toLowerCase().includes(termino) ||
        (presupuesto.cliente?.name?.toLowerCase().includes(termino) ?? false) ||
        (presupuesto.empresa?.name?.toLowerCase().includes(termino) ?? false)
      );
    });
  }

  async descargarPDF(presupuesto: SavedPresupuesto) {
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

  private buildPrintableDocument(presupuesto: SavedPresupuesto): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '16px';
    wrapper.innerHTML = `
      <h2 style="margin-bottom:8px;">${presupuesto.name}</h2>
      <p><strong>Creado:</strong> ${new Date(presupuesto.createdAt).toLocaleString()}</p>
      <p><strong>Empresa:</strong> ${presupuesto.empresa?.name || 'Sin empresa'}</p>
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
