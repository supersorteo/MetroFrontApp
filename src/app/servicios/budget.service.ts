import { Injectable } from '@angular/core';
import { Cliente } from './cliente.service';
import { Empresa } from './empresa.service';
import { UserTarea } from './user-tarea.service';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';

/*export interface SavedPresupuesto {
  id?: number;
  name: string;
  createdAt: string;
  cliente: Cliente | null;
  empresa: Empresa | null;
  tareas: UserTarea[];
  userCode: string;
}*/

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
private apiUrl = 'http://localhost:8080/api/presupuestos';
//private apiUrl = 'https://adequate-education-production.up.railway.app/api/presupuestos';

private presupuestosSubject = new BehaviorSubject<SavedPresupuesto[]>([]);
  presupuestos$ = this.presupuestosSubject.asObservable();



  constructor(private http: HttpClient) {}

cargarPresupuestosPorCliente(clienteId: number): Observable<SavedPresupuesto[]> {
    console.log('%cCARGANDO PRESUPUESTOS del cliente ID:', 'color: #4CAF50; font-weight: bold', clienteId);
    return this.http.get<SavedPresupuesto[]>(`${this.apiUrl}/cliente/${clienteId}`).pipe(
      tap(presupuestos => {
        console.log('%cPRESUPUESTOS CARGADOS (' + presupuestos.length + ')', 'color: #2196F3; font-weight: bold', presupuestos);
        this.presupuestosSubject.next(presupuestos);
      }),
      catchError(err => {
        console.error('%cERROR al cargar presupuestos', 'color: #F44336', err);
        throw err;
      })
    );
  }

  guardarPresupuesto(payload: any): Observable<SavedPresupuesto> {
    console.log('%cGUARDANDO PRESUPUESTO...', 'color: #FF9800; font-weight: bold');
    console.log('Payload enviado al backend:', JSON.parse(JSON.stringify(payload)));

    return this.http.post<SavedPresupuesto>(this.apiUrl, payload).pipe(
      tap(nuevo => {
        console.log('%cPRESUPUESTO GUARDADO EXITOSAMENTE', 'color: #4CAF50; font-weight: bold', nuevo);
        const actuales = this.presupuestosSubject.value;
        this.presupuestosSubject.next([nuevo, ...actuales]);
      }),
      catchError(err => {
        console.error('%cERROR al guardar presupuesto', 'color: #F44336', err.error || err);
        throw err;
      })
    );
  }

  eliminarPresupuesto0(id: any): Observable<void> {
    console.log('%cELIMINANDO presupuesto ID:', 'color: #F44336; font-weight: bold', id);
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        console.log('%cPresupuesto eliminado del backend', 'color: #4CAF50');
        const actuales = this.presupuestosSubject.value;
        this.presupuestosSubject.next(actuales.filter(p => p.id !== id));
      }),
      catchError(err => {
        console.error('%cERROR al eliminar', 'color: #F44336', err);
        throw err;
      })
    );
  }

   eliminarPresupuesto(id: number): Observable<void> {  // 🔥 Cambié 'any' por 'number'
    console.log('%cELIMINANDO presupuesto ID:', 'color: #F44336; font-weight: bold', id);

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        console.log('%cPresupuesto eliminado del backend', 'color: #4CAF50');

        // Actualizar el estado local
        const actuales = this.presupuestosSubject.value;
        const actualizado = actuales.filter(p => p.id !== id);

        console.log('%cPresupuestos en local después de eliminar:', 'color: #2196F3', actualizado);
        this.presupuestosSubject.next(actualizado);
      }),
      catchError(err => {
        console.error('%cERROR al eliminar', 'color: #F44336', err);
        // Recargar presupuestos en caso de error para sincronizar
        throw err;
      })
    );
  }

  get presupuestosActuales(): SavedPresupuesto[] {
    return this.presupuestosSubject.value;
  }


  agregarTareaAPresupuesto(presupuestoId: number, tareaId: number): Observable<SavedPresupuesto> {
    console.log('%cAGREGANDO tarea', tareaId, 'a presupuesto', presupuestoId, 'color: #FF9800; font-weight: bold');

    return this.http.post<SavedPresupuesto>(
      `${this.apiUrl}/${presupuestoId}/tareas/${tareaId}`,
      {}  // Body vacío
    ).pipe(
      tap(actualizado => {
        console.log('%cTarea agregada correctamente', 'color: #4CAF50', actualizado);

        // Actualizar en el BehaviorSubject
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
    console.log('%cELIMINANDO tarea', tareaId, 'del presupuesto', presupuestoId, 'color: #F44336; font-weight: bold');

    return this.http.delete<SavedPresupuesto>(
      `${this.apiUrl}/${presupuestoId}/tareas/${tareaId}`
    ).pipe(
      tap(actualizado => {
        console.log('%cTarea eliminada correctamente', 'color: #4CAF50', actualizado);

        // Actualizar en el BehaviorSubject
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
  console.log('%cACTUALIZANDO PRESUPUESTO...', 'color: #FF9800; font-weight: bold');
  console.log('ID:', id);
  console.log('Payload:', JSON.parse(JSON.stringify(payload)));

  return this.http.put<SavedPresupuesto>(`${this.apiUrl}/${id}`, payload).pipe(
    tap(actualizado => {
      console.log('%cPRESUPUESTO ACTUALIZADO', 'color: #4CAF50; font-weight: bold', actualizado);

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
