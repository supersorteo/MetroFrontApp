
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PresupuestoService, Tarea } from '../../servicios/presupuesto.service';
import { Cliente, ClienteService } from '../../servicios/cliente.service';
import { Empresa, EmpresaService } from '../../servicios/empresa.service';
import { ToastrService } from 'ngx-toastr';
import { AccessCode, AuthService } from '../../servicios/auth.service';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
declare var html2pdf: any;


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

  constructor(
    private presupuestoService: PresupuestoService,
    private authService: AuthService,
    private clienteService: ClienteService,
    private empresaService: EmpresaService,
    private toastr: ToastrService,
    private route:Router

  ) {}

  ngOnInit(): void {
    // Recuperar datos seleccionados desde localStorage
    const storedEmpresa = localStorage.getItem('selectedEmpresa');
    const storedCliente = localStorage.getItem('selectedCliente');
    const storedTareas = localStorage.getItem('selectedTareas');
    if (storedEmpresa) {
      this.empresaSeleccionada = JSON.parse(storedEmpresa);
    }
    if (storedCliente) {
      this.clienteSeleccionado = JSON.parse(storedCliente);
    }
    if (storedTareas) {
      this.tareasAgregadas = JSON.parse(storedTareas);
    }
    // Puedes agregar lógica para cargar datos adicionales si es necesario
    console.log('Empresa seleccionada:', this.empresaSeleccionada);
    console.log('Cliente seleccionado:', this.clienteSeleccionado);
    console.log('Tareas asociadas:', this.tareasAgregadas);
  }

  calcularCostoTotal(): number {
    return this.tareasAgregadas.reduce((total, tarea) => total + (tarea.totalCost || 0), 0);
  }


volverAlDashboard(){
this.route.navigate(['/dashboard'])
}

descargarPresupuesto() {
    // Oculta los botones antes de descargar
    const dashboardBtn = document.querySelector('.btn-floating');
    const descargarBtn = document.querySelector('.presupuesto-total-descarga .btn-primary');
    if (dashboardBtn) (dashboardBtn as HTMLElement).style.display = 'none';
    if (descargarBtn) (descargarBtn as HTMLElement).style.display = 'none';

    setTimeout(() => {
      // Agrega estilos embebidos para bordes de tabla
      const style = document.createElement('style');
      style.innerHTML = `
        table, th, td {
          border: 1px solid #0d6efd !important;
          border-collapse: collapse !important;
        }
        th, td {
          padding: 8px !important;
        }
        th {
          background: #0d6efd !important;
          color: #fff !important;
        }
      `;
      document.head.appendChild(style);

      const html = document.documentElement.outerHTML;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'presupuesto.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      // Vuelve a mostrar los botones y elimina el estilo embebido
      if (dashboardBtn) (dashboardBtn as HTMLElement).style.display = '';
      if (descargarBtn) (descargarBtn as HTMLElement).style.display = '';
      document.head.removeChild(style);
    }, 100);
  }

  async descargarPresupuesto0() {
    const result = await Swal.fire({
      title: 'Descargar presupuesto',
      text: '¿En qué formato deseas descargar?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Descargar HTML',
      cancelButtonText: 'Descargar PDF',
      reverseButtons: true,
      allowOutsideClick: false
    });

    // Oculta los botones antes de descargar
    const dashboardBtn = document.querySelector('.btn-floating');
    const descargarBtn = document.querySelector('.presupuesto-total-descarga .btn-primary');
    if (dashboardBtn) (dashboardBtn as HTMLElement).style.display = 'none';
    if (descargarBtn) (descargarBtn as HTMLElement).style.display = 'none';

    setTimeout(async () => {
      // Agrega estilos embebidos para bordes de tabla
      const style = document.createElement('style');
      style.innerHTML = `
        table, th, td {
          border: 1px solid #0d6efd !important;
          border-collapse: collapse !important;
        }
        th, td {
          padding: 8px !important;
        }
        th {
          background: #0d6efd !important;
          color: #fff !important;
        }
      `;
      document.head.appendChild(style);

      if (!result.isConfirmed && result.dismiss === Swal.DismissReason.cancel) {
        // Descarga como PDF usando html2pdf.js
        const element = document.querySelector('.table-responsive');
        if (element) {
          html2pdf()
            .set({
              margin: 10,
              filename: 'presupuesto.pdf',
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2 },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            })
            .from(element)
            .save();
        } else {
          Swal.fire('Error', 'No se encontró la tabla para exportar.', 'error');
        }
      } else {
        // Descarga como HTML
        const html = document.documentElement.outerHTML;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'presupuesto.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      // Vuelve a mostrar los botones y elimina el estilo embebido
      if (dashboardBtn) (dashboardBtn as HTMLElement).style.display = '';
      if (descargarBtn) (descargarBtn as HTMLElement).style.display = '';
      document.head.removeChild(style);
    }, 100);
  }






}

