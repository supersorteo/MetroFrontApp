import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PresupuestoService, Tarea } from '../../servicios/presupuesto.service';
import { Cliente, ClienteService } from '../../servicios/cliente.service';
import { Empresa, EmpresaService } from '../../servicios/empresa.service';
import { AppToastService } from '../../servicios/app-toast.service';
import { UiDialogService } from '../../core/services/ui-dialog.service';
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
  showTextBudgetModal: boolean = false;
  textoPresupuestoEditable: string = '';
  readonly PREVIEW_OPTIONS_KEY = 'metroBudgetPreviewVisibility';

  // Modal de edición de tarea
  showEditModal = false;
  editingIndex = -1;
  editForm: { tarea: string; descripcion: string; area: number; costo: number; descuento: number } = {
    tarea: '', descripcion: '', area: 0, costo: 0, descuento: 0
  };

  get editTotalCost(): number {
    const base = (this.editForm.costo || 0) * (this.editForm.area || 0);
    return Math.round(base * (1 - (this.editForm.descuento || 0) / 100) * 100) / 100;
  }

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
    private appToast: AppToastService,
    private uiDialog: UiDialogService,
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
    return Math.round(this.tareasAgregadas.reduce((total, tarea) => total + (tarea.totalCost || 0), 0) * 100) / 100;
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private formatBudgetDate(value: string | undefined): string {
    if (!value) return '';
    const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return isoDate ? `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}` : value;
  }

  // ============ NAVEGACIÓN ============
  volverAlDashboard(): void {
    const isTrial = localStorage.getItem('trialMode') === 'true';
    if (isTrial) {
      localStorage.setItem('trialMode', 'true');
    }
    this.route.navigate(['/dashboard']);
  }

  // ============ EDITAR TAREA ============
  abrirEditarTarea(index: number): void {
    const t = this.tareasAgregadas[index];
    if (!t) return;
    this.editingIndex = index;
    this.editForm = {
      tarea:       t.tarea,
      descripcion: t.descripcion || '',
      area:        Math.round((t.area || 0) * 100) / 100,
      costo:       Math.round((t.costo || 0) * 100) / 100,
      descuento:   Math.round((t.descuento || 0) * 100) / 100
    };
    this.showEditModal = true;
  }

  cerrarEditarTarea(): void {
    this.showEditModal = false;
    this.editingIndex = -1;
  }

  async guardarEditarTarea(): Promise<void> {
    if (this.editingIndex < 0) return;
    const totalCost = this.editTotalCost;
    this.tareasAgregadas = this.tareasAgregadas.map((t, i) =>
      i === this.editingIndex ? { ...t, ...this.editForm, totalCost } : t
    );
    localStorage.setItem('selectedTareas', JSON.stringify(this.tareasAgregadas));
    localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));
    const activePreview = await this.localStore.getState<any>('budget:active-preview');
    if (activePreview) {
      await this.localStore.setState('budget:active-preview', { ...activePreview, tareas: this.tareasAgregadas });
    }
    this.cerrarEditarTarea();
  }

  // ============ ELIMINAR TAREA ============
  async eliminarTarea(index: number): Promise<void> {
    const tarea = this.tareasAgregadas[index];
    if (!tarea) return;

    const confirmed = await this.uiDialog.confirmDelete(tarea.tarea);
    if (!confirmed) return;

    this.tareasAgregadas = this.tareasAgregadas.filter((_, i) => i !== index);

    localStorage.setItem('selectedTareas', JSON.stringify(this.tareasAgregadas));
    localStorage.setItem('tareasAgregadas', JSON.stringify(this.tareasAgregadas));

    const activePreview = await this.localStore.getState<any>('budget:active-preview');
    if (activePreview) {
      await this.localStore.setState('budget:active-preview', { ...activePreview, tareas: this.tareasAgregadas });
    }
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
      this.appToast.error('No se encontró el contenido del presupuesto para exportar.', 'Error');
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
            this.appToast.success('Presupuesto descargado correctamente', 'PDF generado');
            document.head.removeChild(inlineStyle);
          })
          .catch((error: any) => {
            console.error('Error al generar el PDF', error);
            this.appToast.error('No se pudo generar el PDF. Inténtalo nuevamente.', 'Error');
            document.head.removeChild(inlineStyle);
          });
      } else {
        // Fallback: imprimir con estilo de impresión nativo
        window.print();
        document.head.removeChild(inlineStyle);
      }
    } catch (error) {
      console.error('Error al generar el PDF', error);
      this.appToast.error('No se pudo generar el PDF.', 'Error');
      if (document.getElementById('pdf-export-style')) {
        document.head.removeChild(inlineStyle);
      }
    }
  }

  // ============ DESCARGA HTML ============
  descargarHTML(): void {
    const exportElement = document.getElementById('export-presupuesto');
    if (!exportElement) {
      this.appToast.error('No se encontró el contenido del presupuesto para exportar.', 'Error');
      return;
    }

    const scheme = this.loadColorScheme();
    // Exportar únicamente el presupuesto evita incluir componentes globales como ARCHI.
    const clone = exportElement.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.no-print').forEach(el => el.remove());
    this.replaceExportCardIcons(clone);

    const exportStyles = this.collectExportStyles();
    const exportOverrides = `
      html, body { margin: 0; padding: 0; background: #fff; }
      #export-presupuesto { min-height: auto; background: #fff; }
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
      #export-presupuesto .export-inline-icon {
        display: inline-block;
        width: 1em;
        height: 1em;
        vertical-align: -0.12em;
        fill: currentColor;
        overflow: visible;
      }
    `;

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Presupuesto - ${this.escapeHtml(this.clienteSeleccionado?.name || 'cliente')}</title>
    <style>${exportStyles}\n${exportOverrides}</style>
  </head>
  <body>${clone.outerHTML}</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presupuesto-${this.clienteSeleccionado?.name || 'cliente'}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    this.appToast.success('Presupuesto descargado como HTML', 'Descargado');
  }

  private collectExportStyles(): string {
    return Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules).map(rule => rule.cssText).join('\n');
        } catch {
          return '';
        }
      })
      .filter(Boolean)
      .join('\n');
  }

  private replaceExportCardIcons(root: HTMLElement): void {
    const iconContents: Record<string, string> = {
      'fa-phone-alt': '<path d="M3.654 1.328a.678.678 0 0 1 1.015-.063l2.29 2.29a.678.678 0 0 1 .063.882l-1.12 1.497a.678.678 0 0 0 .078.846l3.25 3.25a.678.678 0 0 0 .846.078l1.497-1.12a.678.678 0 0 1 .882.063l2.29 2.29a.678.678 0 0 1-.063 1.015l-1.01.757c-.77.578-1.75.765-2.67.505-2.36-.67-4.67-2.2-6.72-4.25S1.4 5.55.73 3.19c-.26-.92-.073-1.9.505-2.67z"/>',
      'fa-envelope': '<path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h11A1.5 1.5 0 0 1 15 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5zM2.5 3a.5.5 0 0 0-.5.5v.217l6 3.6 6-3.6V3.5a.5.5 0 0 0-.5-.5zM14 4.883l-5.743 3.446a.5.5 0 0 1-.514 0L2 4.883V12.5a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5z"/>',
      'fa-id-card': '<path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/><circle cx="5" cy="8" r="1.5"/><path d="M8 6.5h5v1H8zm0 2h5v1H8z"/>',
      'fa-id-badge': '<path d="M6.5 0a.5.5 0 0 0-.5.5V1H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-2V.5a.5.5 0 0 0-.5-.5zM10 2h2a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h2v1h4z"/><circle cx="8" cy="7" r="2"/><path d="M4.5 13a3.5 3.5 0 0 1 7 0z"/>',
      'fa-map-marker-alt': '<path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/>',
      'fa-calendar-alt': '<path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h.5A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-11A1.5 1.5 0 0 1 2.5 1H3V.5a.5.5 0 0 1 .5-.5M2 4v9.5a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5V4z"/>',
      'fa-file-invoice': '<path d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2m0 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"/><path d="M4 4h8v1H4zm0 2h8v1H4zm0 3h5v1H4z"/>',
      'fa-calculator': '<rect x="3" y="1" width="10" height="14" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="5" y="3" width="6" height="2" rx=".3"/><path d="M5 7h1v1H5zm2 0h1v1H7zm2 0h1v1H9zM5 9h1v1H5zm2 0h1v1H7zm2 0h1v1H9zM5 11h1v1H5zm2 0h1v1H7zm2 0h1v1H9z"/>',
      'fa-sticky-note': '<path d="M5 0h6a2 2 0 0 1 2 2v8.586L9.586 14H5a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2m0 1a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h4v-3a1 1 0 0 1 1-1h3V2a1 1 0 0 0-1-1z"/>',
      'fa-globe': '<path d="M8 16a8 8 0 1 0 0-16 8 8 0 0 0 0 16M1 8h14M8 1c2 2.2 2 11.8 0 14M8 1C6 3.2 6 12.8 8 15" fill="none" stroke="currentColor" stroke-width="1"/>',
      'fa-user-tie': '<circle cx="8" cy="5" r="3"/><path d="M2 15a6 6 0 0 1 12 0z"/>',
      'bi-tiktok': '<path d="M9 0h2c.2 1.3.8 2.3 2.2 3.2.6.4 1.2.6 1.8.7v2c-1.2 0-2.3-.4-3.2-1.1V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z"/>',
      'bi-instagram': '<path d="M5 0C2.2 0 0 2.2 0 5v6c0 2.8 2.2 5 5 5h6c2.8 0 5-2.2 5-5V5c0-2.8-2.2-5-5-5zm0 1h6c2.2 0 4 1.8 4 4v6c0 2.2-1.8 4-4 4H5c-2.2 0-4-1.8-4-4V5c0-2.2 1.8-4 4-4m6.5 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8m0 1a3 3 0 1 1 0 6 3 3 0 0 1 0-6"/>',
      'bi-facebook': '<path d="M8.5 0H11v3H8.5C7.7 3 7 3.7 7 4.5V6h3l-.5 3H7v7H4V9H2V6h2V4.5A4.5 4.5 0 0 1 8.5 0"/>'
    };

    root.querySelectorAll<HTMLElement>('.company-card i, .client-card i, .total-bar i').forEach(icon => {
      const iconName = Array.from(icon.classList).find(className => iconContents[className]);
      const content = iconName ? iconContents[iconName] : '<circle cx="8" cy="8" r="6"/>';
      const className = icon.classList.contains('detail-icon')
        ? 'detail-icon export-inline-icon'
        : 'export-inline-icon';
      icon.outerHTML = `<svg class="${className}" viewBox="0 0 16 16" aria-hidden="true">${content}</svg>`;
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ============ PRESUPUESTO SOLO TEXTO ============
  abrirPresupuestoSoloTexto(): void {
    this.textoPresupuestoEditable = this.generarTextoPresupuesto();
    this.showDownloadModal = false;
    this.showTextBudgetModal = true;
  }

  cerrarPresupuestoSoloTexto(): void {
    this.showTextBudgetModal = false;
  }

  private generarTextoPresupuesto(): string {
    const empresa = this.empresaSeleccionada?.name || 'Sin empresa';
    const cliente = this.clienteSeleccionado?.name || 'Sin cliente';
    const fecha = this.formatBudgetDate(this.clienteSeleccionado?.budgetDate);
    const lineasTareas = this.tareasAgregadas.map((tarea, index) => {
      const descripcion = tarea.descripcion ? `\n   ${tarea.descripcion}` : '';
      const area = this.formatCurrency(tarea.area || 0);
      const costo = this.formatCurrency(tarea.costo || 0);
      const total = this.formatCurrency(tarea.totalCost || 0);
      const unitario = this.hideCostPerM2 ? '' : ` | Unitario: $${costo}`;
      return `${index + 1}. ${tarea.tarea}${descripcion}\n   Cantidad: ${area}${unitario} | Total: $${total}`;
    });

    return [
      empresa,
      this.presupuestoNombre ? `Presupuesto: ${this.presupuestoNombre}` : 'Presupuesto',
      `Cliente: ${cliente}`,
      ...(fecha ? [`Fecha: ${fecha}`] : []),
      '',
      'DETALLE',
      ...(lineasTareas.length ? lineasTareas : ['Sin tareas cargadas']),
      '',
      `TOTAL: $${this.formatCurrency(this.calcularCostoTotal())}`
    ].join('\n');
  }

  async copiarPresupuestoSoloTexto(): Promise<void> {
    const texto = this.textoPresupuestoEditable.trim();
    if (!texto) {
      this.appToast.warning('No hay texto para copiar.');
      return;
    }

    try {
      await navigator.clipboard.writeText(texto);
      this.appToast.success('Texto copiado al portapapeles.');
    } catch {
      this.appToast.error('No se pudo copiar el texto automáticamente.');
    }
  }

  abrirWhatsAppConPresupuesto(): void {
    const texto = this.textoPresupuestoEditable.trim();
    if (!texto) {
      this.appToast.warning('Escribí un texto antes de abrir WhatsApp.');
      return;
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
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
