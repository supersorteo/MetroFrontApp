import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserTareaService } from './user-tarea.service';
import { OfflineLocalStoreService } from './offline-local-store.service';


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

  constructor(
    private userTareaService: UserTareaService,
    private localStore: OfflineLocalStoreService
  ) {
    const storedTareas = localStorage.getItem('tareasAgregadas');
    if (storedTareas) {
      this.tareasAgregadasSubject.next(JSON.parse(storedTareas));
    }

    this.hydrateFromIndexedState();

    // En modo demo los datos siempre son locales.
    if (localStorage.getItem('trialMode') === 'true' || !navigator.onLine) {
      return;
    }

    // En modo autenticado solo hidratamos desde backend si hay código real.
    const userCode = localStorage.getItem('userCode');
    if (userCode && userCode !== 'demo') {
      this.userTareaService.getTareasByUserCode(userCode).subscribe({
        next: (tareas) => {
          this.tareasAgregadasSubject.next(tareas);
          localStorage.setItem('tareasAgregadas', JSON.stringify(tareas));
        },
        error: () => console.error('Error al sincronizar tareas desde el backend')
      });
    }
  }




setTareasAgregadas(tareas: Tarea[]): void {
    this.tareasAgregadasSubject.next(tareas);
    localStorage.setItem('tareasAgregadas', JSON.stringify(tareas)); // Guardar en localStorage
    this.localStore.setState('presupuesto:tareasAgregadas', tareas);
  }

  getTareasAgregadas(): Observable<Tarea[]> {
    return this.tareasAgregadas$;
  }

  private async hydrateFromIndexedState(): Promise<void> {
    const activePreview = await this.localStore.getState<any>('budget:active-preview');
    const previewTasks = activePreview?.tareas || activePreview?.presupuesto?.tareas;
    if (Array.isArray(previewTasks) && previewTasks.length > 0) {
      this.tareasAgregadasSubject.next(previewTasks);
      return;
    }

    const indexedTasks = await this.localStore.getState<Tarea[]>('presupuesto:tareasAgregadas');
    if (Array.isArray(indexedTasks) && indexedTasks.length > 0) {
      this.tareasAgregadasSubject.next(indexedTasks);
    }
  }

}
