import { Injectable, signal, effect, inject } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { combineLatest, from, switchMap, of, map } from 'rxjs';
import { metroDB } from '../servicios/metro-db.service';
import { UserTarea, UserTareaService } from '../servicios/user-tarea.service';
import { ClienteStore } from './cliente.store';
import { EmpresaStore } from './empresa.store';

@Injectable({ providedIn: 'root' })
export class UserTareaStore {
  private readonly svc = inject(UserTareaService);
  private readonly clienteStore = inject(ClienteStore);
  private readonly empresaStore = inject(EmpresaStore);

  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  readonly tareas = toSignal(
    combineLatest([
      toObservable(this.clienteStore.selectedId),
      toObservable(this.empresaStore.selectedId)
    ]).pipe(
      switchMap(([clienteId, empresaId]) =>
        clienteId && empresaId
          ? from(liveQuery(() =>
              metroDB.userTareas
                .filter(r =>
                  !r.deletedAt &&
                  (Number(r.clienteServerId) === clienteId ||
                   Number(r.data?.clienteId) === clienteId) &&
                  (!r.data?.empresaId || Number(r.data?.empresaId) === empresaId)
                )
                .toArray()
            )).pipe(
              map(records =>
                records
                  .sort((a, b) => a.updatedAt - b.updatedAt)
                  .map(r => ({ ...r.data, id: r.serverId ?? r.data?.id } as UserTarea))
              )
            )
          : of([] as UserTarea[])
      )
    ),
    { initialValue: [] as UserTarea[] }
  );

  constructor() {
    // Cuando cambia cliente o empresa → disparar HTTP en background
    effect(() => {
      const clienteId = this.clienteStore.selectedId();
      const empresaId = this.empresaStore.selectedId();
      if (!clienteId || !empresaId) return;
      this._loading.set(true);
      this.svc.getTareasByClienteAndEmpresa(clienteId, empresaId).subscribe({
        next: () => this._loading.set(false),
        error: () => this._loading.set(false)
      });
    }, { allowSignalWrites: true });
  }
}
