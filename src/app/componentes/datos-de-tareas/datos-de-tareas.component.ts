import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PresupuestoService, Tarea } from '../../servicios/presupuesto.service';
import { Cliente, ClienteService } from '../../servicios/cliente.service';
import { Empresa, EmpresaService } from '../../servicios/empresa.service';
import { ToastrService } from 'ngx-toastr';
import { AccessCode, AuthService } from '../../servicios/auth.service';


@Component({
  selector: 'app-datos-de-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './datos-de-tareas.component.html',
  styleUrl: './datos-de-tareas.component.scss'
})
export class DatosDeTareasComponent implements OnInit {
  empresas: Empresa[] = [];
  tareasAgregadas: Tarea[] = [];
  userData: AccessCode | null = null;
  userCode: string = '';
  clientes: Cliente[] = [];

  constructor(
    private presupuestoService: PresupuestoService,
    private authService: AuthService,
    private clienteService: ClienteService,
    private empresaService: EmpresaService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.userCode = localStorage.getItem('userCode') || '';
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      this.userData = JSON.parse(storedUserData);
    }

    // Sincronizar datos del usuario con el backend
    if (this.userCode) {
      this.authService.getUserCode(this.userCode).subscribe({
        next: (userData) => {
          this.userData = userData;
          localStorage.setItem('userData', JSON.stringify(userData));
          console.log('Datos del usuario cargados:', this.userData);
        },
        error: () => {
          this.toastr.error('Error al cargar los datos del usuario desde el backend', 'Error');
          console.log('Usando datos de usuario de localStorage:', this.userData);
        }
      });
      // Obtener clientes asociados al usuario
      this.clienteService.getClienteByUserCode(this.userCode).subscribe({
        next: (clientes) => {
          this.clientes = clientes || [];
          console.log('Clientes asociados:', this.clientes);
        },
        error: (err) => {
          let msg = err?.message || err?.error?.message || 'No tienes clientes asociados a tu usuario.';
          if (msg.includes('404')) {
            msg = 'No tienes clientes asociados a tu usuario.';
          }
          this.toastr.info(msg, 'Sin clientes', { timeOut: 3000 });
          this.clientes = [];
          console.warn('Sin clientes asociados:', msg);
        }
      });
      // Obtener empresa asociada al usuario
      this.empresaService.getEmpresaByUserCode(this.userCode).subscribe({
        next: (empresas) => {
          // Si el backend devuelve un solo objeto, lo convertimos en array
          this.empresas = Array.isArray(empresas) ? empresas : [empresas];
          console.log('Empresas asociadas:', this.empresas);
        },
        error: (err) => {
          let msg = err?.message || err?.error?.message || 'No tienes empresa asociada a tu usuario.';
          if (msg.includes('404')) {
            msg = 'No tienes empresa asociada a tu usuario.';
          }
          this.toastr.info(msg, 'Sin empresa', { timeOut: 3000 });
          this.empresas = [];
          console.warn('Sin empresa asociada:', msg);
        }
      });
    }

    const storedTareas = localStorage.getItem('tareasAgregadas');
    if (storedTareas) {
      this.tareasAgregadas = JSON.parse(storedTareas);
    }

    // Sincronizar con el servicio
    this.presupuestoService.getTareasAgregadas().subscribe({
      next: (tareas) => {
        this.tareasAgregadas = tareas;
        console.log('Tareas cargadas:', this.tareasAgregadas);
      },
      error: () => {
        this.toastr.error('Error al cargar las tareas agregadas', 'Error');
      }
    });
  }

  calcularCostoTotal(): number {
    return this.tareasAgregadas.reduce((total, tarea) => total + (tarea.totalCost || 0), 0);
  }
}
