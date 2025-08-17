import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserTareaService } from './user-tarea.service';


export interface Tarea {
  id?: number;
  tarea: string;
  costo: number;
  area: number;
  descripcion: string;
  descuento: number;
  totalCost: number;
  userCode?: string;
  pais?: string;
  rubro?: string;
  categoria?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PresupuestoService {

private tareasAgregadasSubject = new BehaviorSubject<Tarea[]>([]);
  tareasAgregadas$: Observable<Tarea[]> = this.tareasAgregadasSubject.asObservable();

  constructor(private userTareaService: UserTareaService) {
const storedTareas = localStorage.getItem('tareasAgregadas');
    if (storedTareas) {
      this.tareasAgregadasSubject.next(JSON.parse(storedTareas));
    }

    // Sincronizar con el backend
    const userCode = localStorage.getItem('userCode');
    if (userCode) {
      this.userTareaService.getTareasByUserCode(userCode).subscribe({
        next: (tareas) => {
          this.tareasAgregadasSubject.next(tareas);
          localStorage.setItem('tareasAgregadas', JSON.stringify(tareas)); // Actualizar localStorage
        },
        error: () => console.error('Error al sincronizar tareas desde el backend')
      });
    }

   }


setTareasAgregadas0(tareas: Tarea[]): void {
    this.tareasAgregadasSubject.next(tareas);
  }

setTareasAgregadas(tareas: Tarea[]): void {
    this.tareasAgregadasSubject.next(tareas);
    localStorage.setItem('tareasAgregadas', JSON.stringify(tareas)); // Guardar en localStorage
  }

  getTareasAgregadas(): Observable<Tarea[]> {
    return this.tareasAgregadas$;
  }

}
