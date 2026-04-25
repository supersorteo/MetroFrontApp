import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, from, map, Observable, tap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { APP_API_URL } from '../core/api/api.config';
import { Cliente } from './cliente.service';
import { Empresa } from './empresa.service';
import { UserTarea } from './user-tarea.service';
import { OfflineSyncService } from './offline-sync.service';
import { OfflineLocalStoreService } from './offline-local-store.service';

export interface SavedPresupuesto {
  id: number;
  name: string;
  createdAt: string;
  cliente: Cliente;
  empresa?: Empresa | null;
  tareas: UserTarea[];
}

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private apiUrl = `${APP_API_URL}/presupuestos`;
  private presupuestosSubject = new BehaviorSubject<SavedPresupuesto[]>([]);

  presupuestos$ = this.presupuestosSubject.asObservable();

  constructor(
    private http: HttpClient,
    private offlineSync: OfflineSyncService,
    private localStore: OfflineLocalStoreService
  ) {}

  get presupuestosActuales(): SavedPresupuesto[] {
    return this.presupuestosSubject.value;
  }

  cargarPresupuestosPorCliente(clienteId: number): Observable<SavedPresupuesto[]> {
    if (!navigator.onLine) {
      return from(this.getLocalBudgets(clienteId)).pipe(
        map(presupuestos => {
          const data = presupuestos ?? [];
          this.setBudgets(data);
          return data;
        })
      );
    }

    return this.http.get<SavedPresupuesto[]>(`${this.apiUrl}/cliente/${clienteId}`).pipe(
      tap(presupuestos => {
        this.setBudgets(presupuestos);
        this.persistBudgets(clienteId, presupuestos);
        presupuestos.forEach(presupuesto => this.localStore.upsertPresupuesto(presupuesto));
      }),
      catchError(err =>
        from(this.getLocalBudgets(clienteId)).pipe(
          map(cached => {
            const data = cached ?? [];
            this.setBudgets(data);
            return data;
          }),
          catchError(() => throwError(() => err))
        )
      )
    );
  }

  guardarPresupuesto(payload: any): Observable<SavedPresupuesto> {
    const clienteId = Number(payload?.cliente?.id);

    if (!navigator.onLine) {
      return this.saveBudgetOffline(payload, clienteId);
    }

    return this.http.post<SavedPresupuesto>(this.apiUrl, payload).pipe(
      tap(nuevo => {
        const actualizados = [nuevo, ...this.presupuestosSubject.value.filter(p => p.id !== nuevo.id)];
        this.setBudgets(actualizados);
        this.persistBudgets(clienteId, actualizados);
        this.localStore.upsertPresupuesto(nuevo);
      }),
      catchError(err =>
        this.isOfflineLikeError(err)
          ? this.saveBudgetOffline(payload, clienteId)
          : throwError(() => err)
      )
    );
  }

  updatePresupuesto(id: number, payload: any): Observable<SavedPresupuesto> {
    const presupuestoActual = this.presupuestosSubject.value.find(item => item.id === id);
    const clienteId = Number(payload?.cliente?.id ?? presupuestoActual?.cliente?.id);

    if (!navigator.onLine) {
      return this.updateBudgetOffline(id, payload, clienteId);
    }

    return this.http.put<SavedPresupuesto>(`${this.apiUrl}/${id}`, payload).pipe(
      tap(actualizado => {
        const actuales = [...this.presupuestosSubject.value];
        const indice = actuales.findIndex(p => p.id === id);
        if (indice !== -1) {
          actuales[indice] = actualizado;
          this.setBudgets(actuales);
          this.persistBudgets(clienteId, actuales);
          this.localStore.upsertPresupuesto(actualizado);
        }
      }),
      catchError(err =>
        this.isOfflineLikeError(err)
          ? this.updateBudgetOffline(id, payload, clienteId)
          : throwError(() => err)
      )
    );
  }

  eliminarPresupuesto(id: number): Observable<void> {
    const presupuesto = this.presupuestosSubject.value.find(item => item.id === id);
    const clienteId = Number(presupuesto?.cliente?.id);

    if (!navigator.onLine) {
      return this.deleteBudgetOffline(id, clienteId);
    }

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const actualizados = this.presupuestosSubject.value.filter(p => p.id !== id);
        this.setBudgets(actualizados);
        this.persistBudgets(clienteId, actualizados);
        this.localStore.markPresupuestoDeleteSynced(id);
      }),
      catchError(err =>
        this.isOfflineLikeError(err)
          ? this.deleteBudgetOffline(id, clienteId)
          : throwError(() => err)
      )
    );
  }

  agregarTareaAPresupuesto(presupuestoId: number, tareaId: number): Observable<SavedPresupuesto> {
    const presupuesto = this.presupuestosSubject.value.find(item => item.id === presupuestoId);
    if (!presupuesto) {
      return throwError(() => new Error('Presupuesto no encontrado'));
    }

    const tarea = this.getCurrentClientTasks().find(item => item.id === tareaId);
    if (!tarea) {
      return throwError(() => new Error('Tarea no encontrada'));
    }

    return this.updatePresupuesto(presupuestoId, {
      name: presupuesto.name,
      cliente: { id: presupuesto.cliente?.id },
      tareas: [...presupuesto.tareas, tarea].map(item => ({ id: item.id }))
    });
  }

  eliminarTareaDePresupuesto(presupuestoId: number, tareaId: number): Observable<SavedPresupuesto> {
    const presupuesto = this.presupuestosSubject.value.find(item => item.id === presupuestoId);
    if (!presupuesto) {
      return throwError(() => new Error('Presupuesto no encontrado'));
    }

    return this.updatePresupuesto(presupuestoId, {
      name: presupuesto.name,
      cliente: { id: presupuesto.cliente?.id },
      tareas: presupuesto.tareas.filter(item => item.id !== tareaId).map(item => ({ id: item.id }))
    });
  }

  private saveBudgetOffline(payload: any, clienteId: number): Observable<SavedPresupuesto> {
    const localBudget = this.buildLocalBudget(payload);
    const actualizados = [localBudget, ...this.presupuestosSubject.value.filter(p => p.id !== localBudget.id)];

    return from(
      Promise.all([
        this.localStore.upsertPresupuesto(localBudget, 'pending'),
        this.offlineSync.addToQueue('presupuesto', 'create', localBudget, this.apiUrl, 'POST')
      ])
    ).pipe(
      tap(() => {
        this.setBudgets(actualizados);
        this.persistBudgets(clienteId, actualizados);
      }),
      map(() => localBudget)
    );
  }

  private updateBudgetOffline(id: number, payload: any, clienteId: number): Observable<SavedPresupuesto> {
    const actuales = [...this.presupuestosSubject.value];
    const indice = actuales.findIndex(item => item.id === id);
    if (indice === -1) {
      return throwError(() => new Error('Presupuesto no encontrado'));
    }

    const actualizado = this.mergeBudget(actuales[indice], payload);
    actuales[indice] = actualizado;

    const pendingOperation = id < 0
      ? this.localStore.upsertPresupuesto(actualizado, 'pending').then(async () => {
          const replaced = await this.offlineSync.replacePendingCreatePayload('presupuesto', id, actualizado);
          if (!replaced) {
            await this.offlineSync.addToQueue('presupuesto', 'create', actualizado, this.apiUrl, 'POST');
          }
        })
      : Promise.all([
          this.localStore.upsertPresupuesto(actualizado, 'pending'),
          this.offlineSync.addToQueue(
            'presupuesto',
            'update',
            {
              name: actualizado.name,
              cliente: { id: actualizado.cliente?.id },
              tareas: actualizado.tareas.map(item => ({ id: item.id }))
            },
            `${this.apiUrl}/${id}`,
            'PUT'
          )
        ]).then(() => undefined);

    return from(pendingOperation).pipe(
      tap(() => {
        this.setBudgets(actuales);
        this.persistBudgets(clienteId, actuales);
      }),
      map(() => actualizado)
    );
  }

  private deleteBudgetOffline(id: number, clienteId: number): Observable<void> {
    const actualizados = this.presupuestosSubject.value.filter(item => item.id !== id);

    const pendingOperation = id < 0
      ? Promise.all([
          this.localStore.markPresupuestoDeleted(id, 'pending'),
          this.offlineSync.removePendingCreate('presupuesto', id)
        ])
      : Promise.all([
          this.localStore.markPresupuestoDeleted(id, 'pending'),
          this.offlineSync.addToQueue('presupuesto', 'delete', { id }, `${this.apiUrl}/${id}`, 'DELETE')
        ]);

    return from(pendingOperation).pipe(
      tap(() => {
        this.setBudgets(actualizados);
        this.persistBudgets(clienteId, actualizados);
      }),
      map(() => void 0)
    );
  }

  private buildLocalBudget(payload: any): SavedPresupuesto {
    const cliente = this.resolveCliente(payload);
    const tareas = this.resolveTareas(payload?.tareas);

    return {
      id: this.generateTempId(),
      name: payload?.name?.trim() || `Presupuesto ${new Date().toLocaleDateString()}`,
      createdAt: new Date().toISOString(),
      cliente,
      empresa: this.getSelectedEmpresa(),
      tareas
    };
  }

  private mergeBudget(current: SavedPresupuesto, payload: any): SavedPresupuesto {
    return {
      ...current,
      name: payload?.name?.trim() || current.name,
      cliente: this.resolveCliente(payload, current.cliente),
      tareas: this.resolveTareas(payload?.tareas, current.tareas),
      empresa: this.getSelectedEmpresa() ?? current.empresa ?? null
    };
  }

  private resolveCliente(payload: any, fallback?: Cliente): Cliente {
    const selected = this.getSelectedCliente();
    const targetId = Number(payload?.cliente?.id);
    if (selected?.id === targetId || (!targetId && selected)) return selected;
    if (fallback?.id === targetId || (!targetId && fallback)) return fallback;

    return fallback ?? selected ?? {
      id: targetId,
      name: 'Cliente',
      contact: '',
      budgetDate: new Date().toISOString().split('T')[0],
      additionalDetails: '',
      userCode: localStorage.getItem('userCode') || '',
      email: '',
      clave: '',
      direccion: '',
      empresaId: this.getSelectedEmpresa()?.id ?? 0
    };
  }

  private resolveTareas(tareasPayload: Array<{ id: number }> | undefined, fallback: UserTarea[] = []): UserTarea[] {
    const currentTasks = this.getCurrentClientTasks();
    if (!Array.isArray(tareasPayload) || tareasPayload.length === 0) return fallback;

    const pool = [...currentTasks, ...fallback];
    return tareasPayload
      .map(item => pool.find(task => task.id === item.id))
      .filter((task): task is UserTarea => !!task)
      .map(task => ({ ...task }));
  }

  private getCurrentClientTasks(): UserTarea[] {
    return this.readJson<UserTarea[]>('tareasAgregadas') ?? [];
  }

  private getSelectedCliente(): Cliente | null {
    return this.readJson<Cliente>('selectedCliente');
  }

  private getSelectedEmpresa(): Empresa | null {
    return this.readJson<Empresa>('selectedEmpresa');
  }

  private setBudgets(budgets: SavedPresupuesto[]): void {
    this.presupuestosSubject.next([...budgets]);
  }

  private persistBudgets(clienteId: number, budgets: SavedPresupuesto[]): void {
    if (clienteId) {
      localStorage.setItem(this.cacheKey(clienteId), JSON.stringify(budgets));
    }
  }

  private async getLocalBudgets(clienteId: number): Promise<SavedPresupuesto[] | null> {
    const indexedBudgets = await this.localStore.listPresupuestosByClienteId(clienteId);
    if (indexedBudgets.length > 0) {
      return indexedBudgets as SavedPresupuesto[];
    }

    return this.readJson<SavedPresupuesto[]>(this.cacheKey(clienteId));
  }

  private readJson<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : null;
    } catch {
      return null;
    }
  }

  private cacheKey(clienteId: number): string {
    return `authPresupuestosCliente_${clienteId}`;
  }

  private generateTempId(): number {
    return -Date.now();
  }

  private isOfflineLikeError(error: any): boolean {
    return [0, 502, 503, 504].includes(Number(error?.status)) || !navigator.onLine;
  }
}
