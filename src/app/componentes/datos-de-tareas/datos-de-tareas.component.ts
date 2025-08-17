import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PresupuestoService, Tarea } from '../../servicios/presupuesto.service';
import { ToastrService } from 'ngx-toastr';
import { AccessCode, AuthService } from '../../servicios/auth.service';


@Component({
  selector: 'app-datos-de-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './datos-de-tareas.component.html',
  styleUrl: './datos-de-tareas.component.scss'
})
export class DatosDeTareasComponent implements OnInit{

  tareasAgregadas: Tarea[] = [];
userData: AccessCode | null = null;
  userCode: string = '';
constructor(private presupuestoService: PresupuestoService, private authService: AuthService,
    private toastr: ToastrService){}


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
          localStorage.setItem('userData', JSON.stringify(userData)); // Actualizar localStorage
          console.log('Datos del usuario cargados:', this.userData);
        },
        error: () => {
          this.toastr.error('Error al cargar los datos del usuario desde el backend', 'Error');
          console.log('Usando datos de usuario de localStorage:', this.userData);
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
