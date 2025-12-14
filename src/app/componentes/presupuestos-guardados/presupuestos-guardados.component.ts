import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Cliente } from '../../servicios/cliente.service';
import { Empresa } from '../../servicios/empresa.service';
import { UserTarea } from '../../servicios/user-tarea.service';
import { BudgetStorageService } from '../../servicios/budget-storage.service';
import { ToastrService } from 'ngx-toastr';
import { BudgetService, SavedPresupuesto } from '../../servicios/budget.service';

declare const html2pdf: any;

@Component({
  selector: 'app-presupuestos-guardados',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './presupuestos-guardados.component.html',
  styleUrl: './presupuestos-guardados.component.scss'
})
export class PresupuestosGuardadosComponent implements OnInit{
  @Input() tareasActuales: UserTarea[] = [];
  @Input() clienteActual: Cliente | null = null;
  @Input() empresaActual: Empresa | null = null;
  @Output() cargarPresupuesto = new EventEmitter<SavedPresupuesto>();

  nombreTemporal = '';
  filtro = '';
  presupuestos$ = this.budgetStorageService.budgets$;
  //maxItems = this.budgetStorageService.maxItems;
  maxItems = 10;
  presupuestos: SavedPresupuesto[] = [];
  constructor(
    private budgetStorageService: BudgetStorageService,
    private toastr: ToastrService,
    private budgetService: BudgetService
  ) {}


  ngOnInit(): void {

    /*console.log('%cPRESUPUESTOS GUARDADOS - INICIADO', 'color: #9C27B0; font-weight: bold');
  if (this.clienteActual?.id) {
    console.log('Cliente actual:', this.clienteActual.name, '(ID:', this.clienteActual.id, ')');
    this.cargarPresupuestos();
  } else {
    console.warn('No hay cliente seleccionado aún');
  }*/



console.log('%cPRESUPUESTOS GUARDADOS - INICIADO', 'color: #9C27B0; font-weight: bold');

  this.budgetService.presupuestos$.subscribe(presupuestos => {
    this.presupuestos = presupuestos;
    console.log('Presupuestos actualizados en componente:', this.presupuestos.length);
  });

  if (this.clienteActual?.id) {
    this.cargarPresupuestos();
  }

}

ngOnChanges(): void {
  if (this.clienteActual?.id) {
    console.log('%cCAMBIO DE CLIENTE DETECTADO → Recargando presupuestos', 'color: #FF9800');
    this.cargarPresupuestos();
  }


}


cargarPresupuestos() {
  if (!this.clienteActual?.id) return;

  console.log('%cCARGANDO PRESUPUESTOS DEL CLIENTE ID:', 'color: #2196F3; font-size: 14px', this.clienteActual.id);
  this.budgetService.cargarPresupuestosPorCliente(this.clienteActual.id).subscribe({
    next: () => console.log('%cPresupuestos cargados y actualizados en el BehaviorSubject', 'color: #4CAF50'),
    error: () => console.error('%cFalló la carga de presupuestos', 'color: #F44336')
  });
}



  /*
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
  }*/

  guardarPresupuestoActual() {
  if (!this.clienteActual?.id) {
    this.toastr.error('Selecciona un cliente');
    return;
  }
  if (this.tareasActuales.length === 0) {
    this.toastr.error('Agrega tareas al presupuesto');
    return;
  }

  const nombre = this.nombreTemporal.trim() || `Presupuesto ${new Date().toLocaleDateString()}`;
  console.log('%cGUARDAR PRESUPUESTO', 'color: #FF9800; font-weight: bold');
  console.log('Nombre:', nombre);
  console.log('Cliente:', this.clienteActual.name, '(ID:', this.clienteActual.id, ')');
  console.log('Tareas a guardar:', this.tareasActuales.map(t => ({ id: t.id, tarea: t.tarea })));

  const payload = {
    name: nombre,
    cliente: { id: this.clienteActual.id },
    tareas: this.tareasActuales.map(t => ({ id: t.id }))
  };

  this.budgetService.guardarPresupuesto(payload).subscribe({
    next: (nuevo) => {
      console.log('%cPresupuesto guardado y añadido a la lista local', 'color: #4CAF50; font-weight: bold', nuevo);
      this.toastr.success('Presupuesto guardado');
      this.nombreTemporal = '';
    },
    error: (err) => {
      console.error('%cERROR al guardar presupuesto', 'color: #F44336', err);
      this.toastr.error(err.error?.error || 'Error al guardar');
    }
  });
}

  cargar(presupuesto: SavedPresupuesto) {
    this.cargarPresupuesto.emit(presupuesto);
  }

 /* eliminar(presupuesto: SavedPresupuesto) {
    this.budgetStorageService.removeBudget(presupuesto.id);
    this.toastr.info('Presupuesto eliminado', presupuesto.name);
  }*/

  eliminar(presupuesto: SavedPresupuesto) {
  if (!presupuesto.id) return;

  console.log('%cELIMINAR PRESUPUESTO ID:', 'color: #F44336; font-weight: bold', presupuesto.id, presupuesto.name);

  this.budgetService.eliminarPresupuesto(presupuesto.id).subscribe({
    next: () => {
      console.log('%cPresupuesto eliminado correctamente', 'color: #4CAF50');
      this.toastr.info('Presupuesto eliminado');
    },
    error: () => this.toastr.error('Error al eliminar')
  });
}

 /*get totalGuardados0(): number {
    return this.budgetStorageService.currentBudgets.length;
  }

  get puedeGuardar0(): boolean {
    return !!this.tareasActuales?.length && this.totalGuardados < this.maxItems;
  }

  get limiteAlcanzado0(): boolean {
    return this.totalGuardados >= this.maxItems;
  }

  get presupuestosFiltrados0(): SavedPresupuesto[] {
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
  }*/


get totalGuardados(): number {
  return this.presupuestos.length;
}

get puedeGuardar(): boolean {
  return this.tareasActuales.length > 0 && this.totalGuardados < this.maxItems;
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
