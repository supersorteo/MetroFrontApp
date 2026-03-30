import { Injectable } from '@angular/core';
import { Cliente } from './cliente.service';
import { Empresa } from './empresa.service';
import { UserTarea } from './user-tarea.service';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { APP_API_URL } from '../core/api/api.config';

export interface SavedPresupuesto {
  id: number;
  name: string;
  createdAt: string;
  cliente: Cliente;
  empresa?: Empresa | null;
  tareas: UserTarea[];
}

@Injectable({
  providedIn: 'root'
})
export class BudgetService {

private apiUrl = `${APP_API_URL}/presupuestos`;

private presupuestosSubject = new BehaviorSubject<SavedPresupuesto[]>([]);
  presupuestos$ = this.presupuestosSubject.asObservable();

  constructor(private http: HttpClient) {}

cargarPresupuestosPorCliente(clienteId: number): Observable<SavedPresupuesto[]> {
    return this.http.get<SavedPresupuesto[]>(`${this.apiUrl}/cliente/${clienteId}`).pipe(
      tap(presupuestos => {
        this.presupuestosSubject.next(presupuestos);
      }),
      catchError(err => {
        console.error('%cERROR al cargar presupuestos', 'color: #F44336', err);
        throw err;
      })
    );
  }

  guardarPresupuesto(payload: any): Observable<SavedPresupuesto> {
    return this.http.post<SavedPresupuesto>(this.apiUrl, payload).pipe(
      tap(nuevo => {
        const actuales = this.presupuestosSubject.value;
        this.presupuestosSubject.next([nuevo, ...actuales]);
      }),
      catchError(err => {
        console.error('%cERROR al guardar presupuesto', 'color: #F44336', err.error || err);
        throw err;
      })
    );
  }

  eliminarPresupuesto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const actuales = this.presupuestosSubject.value;
        const actualizado = actuales.filter(p => p.id !== id);
        this.presupuestosSubject.next(actualizado);
      }),
      catchError(err => {
        console.error('%cERROR al eliminar', 'color: #F44336', err);
        throw err;
      })
    );
  }

  get presupuestosActuales(): SavedPresupuesto[] {
    return this.presupuestosSubject.value;
  }

  agregarTareaAPresupuesto(presupuestoId: number, tareaId: number): Observable<SavedPresupuesto> {
    return this.http.post<SavedPresupuesto>(
      `${this.apiUrl}/${presupuestoId}/tareas/${tareaId}`,
      {}
    ).pipe(
      tap(actualizado => {
        const actuales = this.presupuestosSubject.value;
        const indice = actuales.findIndex(p => p.id === presupuestoId);
        if (indice !== -1) {
          actuales[indice] = actualizado;
          this.presupuestosSubject.next([...actuales]);
        }
      }),
      catchError(err => {
        console.error('%cERROR al agregar tarea', 'color: #F44336', err);
        throw err;
      })
    );
  }

  eliminarTareaDePresupuesto(presupuestoId: number, tareaId: number): Observable<SavedPresupuesto> {
    return this.http.delete<SavedPresupuesto>(
      `${this.apiUrl}/${presupuestoId}/tareas/${tareaId}`
    ).pipe(
      tap(actualizado => {
        const actuales = this.presupuestosSubject.value;
        const indice = actuales.findIndex(p => p.id === presupuestoId);
        if (indice !== -1) {
          actuales[indice] = actualizado;
          this.presupuestosSubject.next([...actuales]);
        }
      }),
      catchError(err => {
        console.error('%cERROR al eliminar tarea', 'color: #F44336', err);
        throw err;
      })
    );
  }

  updatePresupuesto(id: number, payload: any): Observable<SavedPresupuesto> {
  return this.http.put<SavedPresupuesto>(`${this.apiUrl}/${id}`, payload).pipe(
    tap(actualizado => {
      const actuales = this.presupuestosSubject.value;
      const indice = actuales.findIndex(p => p.id === id);
      if (indice !== -1) {
        actuales[indice] = actualizado;
        this.presupuestosSubject.next([...actuales]);
      }
    }),
    catchError(err => {
      console.error('%cERROR al actualizar', 'color: #F44336', err);
      throw err;
    })
  );
}


}
