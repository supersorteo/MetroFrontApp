import { Injectable, signal, effect, inject } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from, switchMap, of, map } from 'rxjs';
import { metroDB } from '../servicios/metro-db.service';
import { UserTarea, UserTareaService } from '../servicios/user-tarea.service';
import { EmpresaStore } from './empresa.store';

@Injectable({ providedIn: 'root' })
export class UserTareaStore {
  private readonly svc = inject(UserTareaService);
  private readonly empresaStore = inject(EmpresaStore);

  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  readonly tareas = toSignal(
    toObservable(this.empresaStore.userCode).pipe(
      switchMap(userCode =>
        userCode
          ? from(liveQuery(() =>
              metroDB.userTareas
                .where('userCode')
                .equals(userCode)
                .filter(r => !r.deletedAt)
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
    effect(() => {
      const userCode = this.empresaStore.userCode();
      if (!userCode) return;
      this._loading.set(true);
      this.svc.getTareasByUserCode(userCode).subscribe({
        next: () => this._loading.set(false),
        error: () => this._loading.set(false)
      });
    }, { allowSignalWrites: true });
  }
}
