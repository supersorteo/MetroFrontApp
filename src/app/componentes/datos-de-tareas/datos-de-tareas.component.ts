import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PresupuestoService, Tarea } from '../../servicios/presupuesto.service';
import { Cliente, ClienteService } from '../../servicios/cliente.service';
import { Empresa, EmpresaService } from '../../servicios/empresa.service';
import { ToastrService } from 'ngx-toastr';
import { AccessCode, AuthService } from '../../servicios/auth.service';
import { Router, RouterModule } from '@angular/router';
import { OfflineLocalStoreService } from '../../servicios/offline-local-store.service';
declare var html2pdf: any;

interface ColorScheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  tableTextColor: string;
  secondaryColor2: string;
  gradientAngle: string;
  infoBoxColorRGBA: string;
  tableBodyColor: string;
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
    tableTextColor: '#132d6b',
    secondaryColor2: '#deecea',
    gradientAngle: 'to bottom',
    infoBoxColorRGBA: 'rgba(248, 249, 250, 1)',
    tableBodyColor: '#ffffff'
  };
  colorScheme: ColorScheme = { ...this.defaultColorScheme };
  private readonly colorSchemeStorageKey = 'metroColorScheme';

  constructor(
    private presupuestoService: PresupuestoService,
    private authService: AuthService,
    private clienteService: ClienteService,
    private empresaService: EmpresaService,
    private toastr: ToastrService,
    private route: Router,
    private localStore: OfflineLocalStoreService
  ) {}

  private getBackgroundColorRgba(hex: string, alpha: number): string {
    if (!hex || hex.length < 7) return `rgba(248, 249, 250, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const red = isNaN(r) ? 248 : r;
    const green = isNaN(g) ? 249 : g;
    const blue = isNaN(b) ? 250 : b;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  async ngOnInit(): Promise<void> {
    this.colorScheme = this.loadColorScheme();

    const activePreview = await this.localStore.getState<any>('budget:active-preview');
    if (activePreview) {
      this.empresaSeleccionada = activePreview.empresa || activePreview.presupuesto?.empresa || null;
      this.clienteSeleccionado = activePreview.cliente || activePreview.presupuesto?.cliente || null;
      this.tareasAgregadas = activePreview.tareas || activePreview.presupuesto?.tareas || [];
      this.presupuestoNombre = activePreview.name || activePreview.presupuesto?.name || '';
      this.loadPreviewOptions();
      return;
    }

    // Recuperar empresa para datos descriptivos (nombre, logo, etc)
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
        background: linear-gradient(${scheme.gradientAngle}, ${scheme.secondaryColor}, ${scheme.secondaryColor2}) !important;
        color: ${scheme.primaryColor} !important;
      }
      #export-presupuesto .info-box {
        background-color: ${scheme.infoBoxColorRGBA} !important;
        border-radius: 12px !important;
        border: 1px solid rgba(0, 0, 0, 0.05) !important;
        padding: 15px !important;
        margin-bottom: 20px !important;
      }
      #export-presupuesto table thead th {
        background-color: ${scheme.accentColor} !important;
        color: ${scheme.tableTextColor} !important;
      }
      #export-presupuesto table tbody tr {
        background-color: ${scheme.tableBodyColor} !important;
        color: ${scheme.textColor} !important;
      }
      #export-presupuesto .total {
        background: linear-gradient(${scheme.gradientAngle}, ${scheme.secondaryColor}, ${scheme.secondaryColor2}) !important;
        color: ${scheme.primaryColor} !important;
        border-color: ${scheme.primaryColor}33 !important;
      }
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
    const scheme = this.loadColorScheme();
    // Crear copia sin elementos no imprimibles
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    
    // Inyectar estilos específicos para asegurar que los colores se mantengan sin CSS externo
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      #export-presupuesto .info-section {
        background: linear-gradient(${scheme.gradientAngle}, ${scheme.secondaryColor}, ${scheme.secondaryColor2}) !important;
        color: ${scheme.primaryColor} !important;
      }
      #export-presupuesto .info-box {
        background-color: ${scheme.infoBoxColorRGBA} !important;
        border-radius: 12px !important;
        border: 1px solid rgba(0, 0, 0, 0.05) !important;
        padding: 15px !important;
        margin-bottom: 20px !important;
      }
      #export-presupuesto table thead th {
        background-color: ${scheme.accentColor} !important;
        color: ${scheme.tableTextColor} !important;
      }
      #export-presupuesto table tbody tr {
        background-color: ${scheme.tableBodyColor} !important;
        color: ${scheme.textColor} !important;
      }
      #export-presupuesto .total {
        background: linear-gradient(${scheme.gradientAngle}, ${scheme.secondaryColor}, ${scheme.secondaryColor2}) !important;
        color: ${scheme.primaryColor} !important;
        border-color: ${scheme.primaryColor}33 !important;
      }
    `;
    clone.querySelector('head')?.appendChild(styleTag);
    
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
      // 1. Intentamos cargar el esquema guardado manualmente (si existe)
      const storedScheme = localStorage.getItem(this.colorSchemeStorageKey);
      let scheme = { ...this.defaultColorScheme };

      if (storedScheme) {
        scheme = { ...scheme, ...JSON.parse(storedScheme) };
      }

      // 2. Si hay empresa seleccionada, sus colores mandan sobre el manual
      const storedEmpresa = localStorage.getItem('selectedEmpresa');
      if (storedEmpresa) {
        const empresa = JSON.parse(storedEmpresa);
        if (empresa.primaryColor) scheme.primaryColor = empresa.primaryColor;
        if (empresa.secondaryColor) scheme.secondaryColor = empresa.secondaryColor;
        if (empresa.tableColor) scheme.accentColor = empresa.tableColor;
        if (empresa.textColor) scheme.textColor = empresa.textColor;
        if (empresa.tableTextColor) scheme.tableTextColor = empresa.tableTextColor;
        if (empresa.secondaryColor2) scheme.secondaryColor2 = empresa.secondaryColor2;
        if (empresa.gradientAngle) scheme.gradientAngle = empresa.gradientAngle;
        if (empresa.tableBodyColor) scheme.tableBodyColor = empresa.tableBodyColor;
        if (empresa.infoBoxColorHex) scheme.infoBoxColorRGBA = this.getBackgroundColorRgba(empresa.infoBoxColorHex, empresa.infoBoxOpacity ?? 1);
      }

      return scheme;
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
