import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PresupuestoService, Tarea } from '../../servicios/presupuesto.service';
import { Cliente, ClienteService } from '../../servicios/cliente.service';
import { Empresa, EmpresaService } from '../../servicios/empresa.service';
import { ToastrService } from 'ngx-toastr';
import { AccessCode, AuthService } from '../../servicios/auth.service';
import { Router, RouterModule } from '@angular/router';
declare var html2pdf: any;

interface ColorScheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  tableTextColor: string;
}

@Component({
  selector: 'app-datos-de-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './datos-de-tareas.component.html',
  styleUrl: './datos-de-tareas.component.scss'
})
export class DatosDeTareasComponent implements OnInit {

  empresaSeleccionada: Empresa | null = null;
  clienteSeleccionado: Cliente | null = null;
  tareasAgregadas: Tarea[] = [];
  presupuestoNombre: string = '';

  // Toggles de visibilidad de columnas (persistentes en localStorage)
  hideCostPerM2: boolean = false;
  hideDescription: boolean = false;
  showDownloadModal: boolean = false;
  readonly PREVIEW_OPTIONS_KEY = 'metroBudgetPreviewVisibility';

  // Color scheme
  colorSchemeMessageVisible = false;
  readonly defaultColorScheme: ColorScheme = {
    primaryColor: '#409eff',
    secondaryColor: '#deecea',
    accentColor: '#5d8eea',
    textColor: '#0b69a6',
    tableTextColor: '#132d6b'
  };
  colorScheme: ColorScheme = { ...this.defaultColorScheme };
  private readonly colorSchemeStorageKey = 'metroColorScheme';

  constructor(
    private presupuestoService: PresupuestoService,
    private authService: AuthService,
    private clienteService: ClienteService,
    private empresaService: EmpresaService,
    private toastr: ToastrService,
    private route: Router
  ) {}

  ngOnInit(): void {
    // Recuperar empresa
    const storedEmpresa = localStorage.getItem('selectedEmpresa');
    if (storedEmpresa) {
      this.empresaSeleccionada = JSON.parse(storedEmpresa);
    }

    // Recuperar cliente
    const storedCliente = localStorage.getItem('selectedCliente');
    if (storedCliente) {
      this.clienteSeleccionado = JSON.parse(storedCliente);
    }

    // Recuperar tareas  — prioridad: selectedTareas > tareasAgregadas
    const storedTareas = localStorage.getItem('selectedTareas') || localStorage.getItem('tareasAgregadas');
    if (storedTareas) {
      this.tareasAgregadas = JSON.parse(storedTareas);
    }

    // Nombre del presupuesto cargado
    const storedPresupuestoName = localStorage.getItem('selectedPresupuestoName');
    if (storedPresupuestoName) {
      this.presupuestoNombre = storedPresupuestoName;
    }

    this.colorScheme = this.loadColorScheme();
    this.loadPreviewOptions();
  }

  // ============ TOTAL ============
  calcularCostoTotal(): number {
    return this.tareasAgregadas.reduce((total, tarea) => total + (tarea.totalCost || 0), 0);
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ============ NAVEGACIÓN ============
  volverAlDashboard(): void {
    const isTrial = localStorage.getItem('trialMode') === 'true';
    if (isTrial) {
      localStorage.setItem('trialMode', 'true');
    }
    this.route.navigate(['/dashboard']);
  }

  // ============ TOGGLES DE VISIBILIDAD ============
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

  // ============ OVERLAY DE DESCARGA ============
  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('download-options-overlay')) {
      this.showDownloadModal = false;
    }
  }

  // ============ DESCARGA PDF ============
  descargarPDF(): void {
    const exportElement = document.getElementById('export-presupuesto');
    if (!exportElement) {
      this.toastr.error('No se encontró el contenido del presupuesto para exportar.', 'Error');
      return;
    }

    const scheme = this.loadColorScheme();
    const inlineStyle = document.createElement('style');
    inlineStyle.id = 'pdf-export-style';
    inlineStyle.innerHTML = `
      #export-presupuesto { background: #ffffff; }
      #export-presupuesto .info-section {
        background: ${scheme.secondaryColor};
        color: ${scheme.textColor};
      }
      #export-presupuesto table { width: 100%; border-collapse: collapse; }
      #export-presupuesto table th, #export-presupuesto table td {
        border: 1px solid rgba(13, 96, 164, 0.2); padding: 10px;
      }
      #export-presupuesto table thead th {
        background: ${scheme.accentColor}; color: #fff;
      }
      #export-presupuesto table tbody td { color: ${scheme.tableTextColor}; }
      #export-presupuesto .total { color: ${scheme.primaryColor}; }
      .no-print { display: none !important; }
    `;
    document.head.appendChild(inlineStyle);

    try {
      if (typeof html2pdf !== 'undefined') {
        html2pdf()
          .set({
            margin: 10,
            filename: `presupuesto-${this.clienteSeleccionado?.name || 'cliente'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          })
          .from(exportElement)
          .save()
          .then(() => {
            this.toastr.success('Presupuesto descargado correctamente', 'PDF generado');
            document.head.removeChild(inlineStyle);
          })
          .catch((error: any) => {
            console.error('Error al generar el PDF', error);
            this.toastr.error('No se pudo generar el PDF. Inténtalo nuevamente.', 'Error');
            document.head.removeChild(inlineStyle);
          });
      } else {
        // Fallback: imprimir con estilo de impresión nativo
        window.print();
        document.head.removeChild(inlineStyle);
      }
    } catch (error) {
      console.error('Error al generar el PDF', error);
      this.toastr.error('No se pudo generar el PDF.', 'Error');
      if (document.getElementById('pdf-export-style')) {
        document.head.removeChild(inlineStyle);
      }
    }
  }

  // ============ DESCARGA HTML ============
  descargarHTML(): void {
    // Crear copia sin elementos no imprimibles
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.no-print').forEach(el => el.remove());
    const htmlContent = '<!DOCTYPE html>\n' + clone.outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presupuesto-${this.clienteSeleccionado?.name || 'cliente'}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    this.toastr.success('Presupuesto descargado como HTML', 'Descargado');
  }

  // ============ COLOR SCHEME ============
  saveColorScheme() {
    try {
      localStorage.setItem(this.colorSchemeStorageKey, JSON.stringify(this.colorScheme));
      this.colorSchemeMessageVisible = true;
      setTimeout(() => { this.colorSchemeMessageVisible = false; }, 2000);
    } catch (error) {
      console.error('No se pudo guardar el esquema de colores.', error);
    }
  }

  private loadColorScheme(): ColorScheme {
    try {
      const storedScheme = localStorage.getItem(this.colorSchemeStorageKey);
      if (storedScheme) {
        const parsedScheme = JSON.parse(storedScheme);
        return { ...this.defaultColorScheme, ...parsedScheme };
      }
    } catch (error) {
      console.error('No se pudo cargar el esquema de colores.', error);
    }
    return { ...this.defaultColorScheme };
  }

  // Mantener compatibilidad con código existente
  async descargarPresupuesto() {
    this.showDownloadModal = true;
  }
}
