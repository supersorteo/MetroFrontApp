import { Injectable, signal, effect, inject } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from, switchMap, of, map } from 'rxjs';
import { metroDB } from '../servicios/metro-db.service';
import { UserTarea, UserTareaService } from '../servicios/user-tarea.service';
import { ClienteStore } from './cliente.store';

@Injectable({ providedIn: 'root' })
export class UserTareaStore {
  private readonly svc = inject(UserTareaService);
  private readonly clienteStore = inject(ClienteStore);

  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  readonly tareas = toSignal(
    toObservable(this.clienteStore.selectedId).pipe(
      switchMap(clienteId =>
        clienteId
          ? from(liveQuery(() =>
              metroDB.userTareas
                .filter(r =>
                  !r.deletedAt &&
                  (Number(r.clienteServerId) === clienteId ||
                   Number(r.data?.clienteId) === clienteId)
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
    // Cuando cambia el cliente seleccionado → disparar HTTP en background
    effect(() => {
      const clienteId = this.clienteStore.selectedId();
      if (!clienteId) return;
      this._loading.set(true);
      this.svc.getTareasByClienteId(clienteId).subscribe({
        next: () => this._loading.set(false),
        error: () => this._loading.set(false)
      });
    }, { allowSignalWrites: true });
  }
}
