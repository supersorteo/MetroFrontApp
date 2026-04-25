import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OfflineLocalStoreService } from '../../servicios/offline-local-store.service';

interface BudgetItem {
  tarea: string;
  descripcion: string;
  area: number;
  costo: number;
  descuento: number;
  totalCost: number;
}

interface EmpresaData {
  name?: string;
  phone?: string;
  email?: string;
  description?: string;
  website?: string;
  tiktok?: string;
  instagram?: string;
  facebook?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  tableColor?: string;
  tableTextColor?: string;
  tableBodyColor?: string;
}

interface ClienteData {
  name?: string;
  contact?: string;
  email?: string;
  direccion?: string;
}

@Component({
  selector: 'app-presupuesto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './presupuesto.component.html',
  styleUrl: './presupuesto.component.scss'
})
export class PresupuestoComponent implements OnInit {

  tareasAgregadas: BudgetItem[] = [];
  empresa: EmpresaData = {};
  cliente: ClienteData = {};
  logoUrl: string = '';
  budgetDate: string = '';
  totalCosto: number = 0;
  showDownloadModal: boolean = false;

  // Toggles de visibilidad
  hideCostPerM2: boolean = false;
  hideDescription: boolean = false;

  readonly PREVIEW_OPTIONS_KEY = 'metroBudgetPreviewVisibility';

  constructor(
    private router: Router,
    private localStore: OfflineLocalStoreService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadPreviewOptions();
  }

  async loadData(): Promise<void> {
    const activePreview = await this.localStore.getState<any>('budget:active-preview');
    if (activePreview) {
      this.applyPreviewData(activePreview);
      this.calcularTotal();
      return;
    }

    // Cargar tareas del localStorage
    const tareasRaw = localStorage.getItem('selectedTareas') || localStorage.getItem('tareasAgregadas');
    if (tareasRaw) {
      try {
        this.tareasAgregadas = JSON.parse(tareasRaw).map((t: any) => ({
          tarea: t.tarea || '',
          descripcion: t.descripcion || '',
          area: Number(t.area) || 0,
          costo: Number(t.costo) || 0,
          descuento: Number(t.descuento) || 0,
          totalCost: Number(t.totalCost) || 0
        }));
      } catch { this.tareasAgregadas = []; }
    }

    // Cargar empresa seleccionada del localStorage
    const empresaRaw = localStorage.getItem('selectedEmpresa');
    if (empresaRaw) {
      try {
        const empresa = JSON.parse(empresaRaw);
        this.empresa = {
          name: empresa.name || '',
          phone: empresa.phone || '',
          email: empresa.email || '',
          description: empresa.description || '',
          website: empresa.website || '',
          tiktok: empresa.tiktok || '',
          instagram: empresa.instagram || '',
          facebook: empresa.facebook || '',
          logoUrl: empresa.logoUrl || '',
          primaryColor: empresa.primaryColor || '#0b69a6',
          secondaryColor: empresa.secondaryColor || '#ffffff',
          textColor: empresa.textColor || '#333333',
          tableColor: empresa.tableColor || '#343a40',
          tableTextColor: empresa.tableTextColor || '#ffffff',
          tableBodyColor: empresa.tableBodyColor || '#ffffff'
        };
        this.logoUrl = empresa.logoUrl || '';
      } catch {}
    }

    // Cargar cliente seleccionado
    const clienteRaw = localStorage.getItem('selectedCliente');
    if (clienteRaw) {
      try {
        const cliente = JSON.parse(clienteRaw);
        this.cliente = {
          name: cliente.name || '',
          contact: cliente.phone || cliente.contact || '',
          email: cliente.email || '',
          direccion: cliente.direccion || ''
        };
      } catch {}
    }

    // Fecha del presupuesto
    const presupuestoCargado = localStorage.getItem('presupuestoCargado');
    if (presupuestoCargado) {
      try {
        const pres = JSON.parse(presupuestoCargado);
        this.budgetDate = pres.budgetDate || new Date().toLocaleDateString('es-AR');
      } catch {}
    } else {
      this.budgetDate = new Date().toLocaleDateString('es-AR');
    }

    this.calcularTotal();
  }

  private applyPreviewData(activePreview: any): void {
    const empresa = activePreview?.empresa || activePreview?.presupuesto?.empresa || {};
    const cliente = activePreview?.cliente || activePreview?.presupuesto?.cliente || {};
    const tareas = activePreview?.tareas || activePreview?.presupuesto?.tareas || [];

    this.tareasAgregadas = Array.isArray(tareas)
      ? tareas.map((t: any) => ({
          tarea: t.tarea || '',
          descripcion: t.descripcion || '',
          area: Number(t.area) || 0,
          costo: Number(t.costo) || 0,
          descuento: Number(t.descuento) || 0,
          totalCost: Number(t.totalCost) || 0
        }))
      : [];

    this.empresa = {
      name: empresa.name || '',
      phone: empresa.phone || '',
      email: empresa.email || '',
      description: empresa.description || '',
      website: empresa.website || '',
      tiktok: empresa.tiktok || '',
      instagram: empresa.instagram || '',
      facebook: empresa.facebook || '',
      logoUrl: empresa.logoUrl || '',
      primaryColor: empresa.primaryColor || '#0b69a6',
      secondaryColor: empresa.secondaryColor || '#ffffff',
      textColor: empresa.textColor || '#333333',
      tableColor: empresa.tableColor || '#343a40',
      tableTextColor: empresa.tableTextColor || '#ffffff',
      tableBodyColor: empresa.tableBodyColor || '#ffffff'
    };
    this.logoUrl = empresa.logoUrl || '';

    this.cliente = {
      name: cliente.name || '',
      contact: cliente.phone || cliente.contact || '',
      email: cliente.email || '',
      direccion: cliente.direccion || ''
    };

    const budgetDate = activePreview?.budgetDate || activePreview?.presupuesto?.createdAt;
    this.budgetDate = budgetDate
      ? new Date(budgetDate).toLocaleDateString('es-AR')
      : new Date().toLocaleDateString('es-AR');
  }

  calcularTotal(): void {
    this.totalCosto = this.tareasAgregadas.reduce((sum, t) => sum + (t.totalCost || 0), 0);
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // --- Toggles de visibilidad ---
  loadPreviewOptions(): void {
    try {
      const stored = JSON.parse(localStorage.getItem(this.PREVIEW_OPTIONS_KEY) || '{}');
      this.hideCostPerM2 = !!stored.hideCostPerM2;
      this.hideDescription = !!stored.hideDescription;
    } catch {
      this.hideCostPerM2 = false;
      this.hideDescription = false;
    }
  }

  savePreviewOptions(): void {
    localStorage.setItem(this.PREVIEW_OPTIONS_KEY, JSON.stringify({
      hideCostPerM2: this.hideCostPerM2,
      hideDescription: this.hideDescription
    }));
  }

  toggleHideCostPerM2(): void {
    this.hideCostPerM2 = !this.hideCostPerM2;
    this.savePreviewOptions();
  }

  toggleHideDescription(): void {
    this.hideDescription = !this.hideDescription;
    this.savePreviewOptions();
  }

  // --- Descarga PDF ---
  downloadPDF(): void {
    window.print();
  }

  // --- Descarga HTML ---
  downloadHTML(): void {
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.no-print').forEach(el => el.remove());
    const htmlContent = '<!DOCTYPE html>\n' + clone.outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presupuesto.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // --- Navegación de vuelta ---
  volver(): void {
    this.router.navigate(['/dashboard']);
  }

  // --- Cerrar overlay al hacer clic afuera ---
  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('download-options-overlay')) {
      this.showDownloadModal = false;
    }
  }

  get isEmpty(): boolean {
    return !this.tareasAgregadas || this.tareasAgregadas.length === 0;
  }
}
