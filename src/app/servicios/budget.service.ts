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

  limpiarPresupuestos(): void {
    this.setBudgets([]);
  }

  cargarPresupuestosPorCliente(clienteId: number): Observable<SavedPresupuesto[]> {
    this.setBudgets([]);
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
        const empresa = this.getSelectedEmpresa();
        const selectedCliente = this.getSelectedCliente();
        const enriched = presupuestos.map(p => {
          const withEmpresa = empresa && !p.empresa ? { ...p, empresa } : p;
          const withCliente = withEmpresa.cliente && !withEmpresa.cliente.name && selectedCliente?.id === withEmpresa.cliente.id
            ? { ...withEmpresa, cliente: { ...selectedCliente, ...withEmpresa.cliente } }
            : withEmpresa;
          return withCliente;
        });
        this.setBudgets(enriched);
        this.persistBudgets(clienteId, enriched);
        enriched.forEach(p => void this.localStore.upsertPresupuesto(p));
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
        const empresa = this.getSelectedEmpresa();
        const enriched = empresa && !nuevo.empresa ? { ...nuevo, empresa } : nuevo;
        const actualizados = [enriched, ...this.presupuestosSubject.value.filter(p => p.id !== enriched.id)];
        this.setBudgets(actualizados);
        this.persistBudgets(clienteId, actualizados, this.resolveEmpresaId(enriched));
        this.localStore.upsertPresupuesto(enriched);
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
        const empresa = this.getSelectedEmpresa();
        const enriched = empresa && !actualizado.empresa ? { ...actualizado, empresa } : actualizado;
        const actuales = [...this.presupuestosSubject.value];
        const indice = actuales.findIndex(p => p.id === id);
        if (indice !== -1) {
          actuales[indice] = enriched;
          this.setBudgets(actuales);
          this.persistBudgets(clienteId, actuales, this.resolveEmpresaId(enriched));
          this.localStore.upsertPresupuesto(enriched);
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

    const syncPayload = {
      name: localBudget.name,
      cliente: { id: localBudget.cliente?.id },
      ...(localBudget.empresa?.id ? { empresa: { id: localBudget.empresa.id } } : {}),
      tareas: localBudget.tareas.map(t => ({ id: t.id }))
    };

    return from(
      Promise.all([
        this.localStore.upsertPresupuesto(localBudget, 'pending'),
        this.offlineSync.addToQueue('presupuesto', 'create', { ...syncPayload, id: localBudget.id }, this.apiUrl, 'POST')
      ])
    ).pipe(
      tap(() => {
        this.setBudgets(actualizados);
        this.persistBudgets(clienteId, actualizados, this.resolveEmpresaId(localBudget));
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

    const buildSyncPayload = (p: SavedPresupuesto) => ({
      id: p.id,
      name: p.name,
      cliente: { id: p.cliente?.id },
      ...(p.empresa?.id ? { empresa: { id: p.empresa.id } } : {}),
      tareas: p.tareas.map(t => ({ id: t.id }))
    });

    const pendingOperation = id < 0
      ? this.localStore.upsertPresupuesto(actualizado, 'pending').then(async () => {
          const syncPayload = buildSyncPayload(actualizado);
          const replaced = await this.offlineSync.replacePendingCreatePayload('presupuesto', id, syncPayload);
          if (!replaced) {
            await this.offlineSync.addToQueue('presupuesto', 'create', syncPayload, this.apiUrl, 'POST');
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
        this.persistBudgets(clienteId, actuales, this.resolveEmpresaId(actualizado));
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

  private persistBudgets(clienteId: number, budgets: SavedPresupuesto[], empresaId = this.getSelectedEmpresaId()): void {
    if (clienteId) {
      localStorage.setItem(this.cacheKey(clienteId, empresaId), JSON.stringify(budgets));
    }
  }

  private async getLocalBudgets(clienteId: number): Promise<SavedPresupuesto[] | null> {
    const empresaId = this.getSelectedEmpresaId();
    const indexedBudgets = await this.localStore.listPresupuestosByClienteId(clienteId, empresaId);
    if (indexedBudgets.length > 0) {
      return indexedBudgets as SavedPresupuesto[];
    }

    const byEmpresa = this.readJson<SavedPresupuesto[]>(this.cacheKey(clienteId, empresaId));
    if (byEmpresa) return byEmpresa;

    const legacy = this.readJson<SavedPresupuesto[]>(this.legacyCacheKey(clienteId));
    if (!legacy) return null;

    // Filter legacy data by empresa to prevent cross-empresa leak
    if (Number.isFinite(empresaId) && Number(empresaId) > 0) {
      const filtered = legacy.filter(p => {
        const pEmpresaId = Number(p.empresa?.id ?? p.cliente?.empresaId);
        return !pEmpresaId || pEmpresaId === empresaId;
      });
      return filtered.length > 0 ? filtered : null;
    }

    return legacy;
  }

  private readJson<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : null;
    } catch {
      return null;
    }
  }

  private cacheKey(clienteId: number, empresaId?: number | null): string {
    const empresaSegment = Number.isFinite(empresaId) ? String(empresaId) : 'sin-empresa';
    return `authPresupuestosEmpresa_${empresaSegment}_Cliente_${clienteId}`;
  }

  private legacyCacheKey(clienteId: number): string {
    return `authPresupuestosCliente_${clienteId}`;
  }

  private getSelectedEmpresaId(): number | undefined {
    const empresaId = Number(this.getSelectedEmpresa()?.id);
    return Number.isFinite(empresaId) ? empresaId : undefined;
  }

  private resolveEmpresaId(presupuesto: SavedPresupuesto | null | undefined): number | undefined {
    const empresaId = Number(
      presupuesto?.empresa?.id ??
      presupuesto?.cliente?.empresaId ??
      this.getSelectedEmpresaId()
    );
    return Number.isFinite(empresaId) ? empresaId : undefined;
  }

  private generateTempId(): number {
    return -Date.now();
  }

  private isOfflineLikeError(error: any): boolean {
    return [0, 502, 503, 504].includes(Number(error?.status)) || !navigator.onLine;
  }
}
