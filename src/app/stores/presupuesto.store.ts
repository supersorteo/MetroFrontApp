import { Injectable, signal, effect, inject } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from, switchMap, of, map } from 'rxjs';
import { metroDB } from '../servicios/metro-db.service';
import { BudgetService, SavedPresupuesto } from '../servicios/budget.service';
import { EmpresaStore } from './empresa.store';

@Injectable({ providedIn: 'root' })
export class PresupuestoStore {
  private readonly svc = inject(BudgetService);
  private readonly empresaStore = inject(EmpresaStore);

  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  readonly presupuestos = toSignal(
    toObservable(this.empresaStore.userCode).pipe(
      switchMap(userCode =>
        userCode
          ? from(liveQuery(() =>
              metroDB.presupuestos
                .where('userCode')
                .equals(userCode)
                .filter(r => !r.deletedAt)
                .toArray()
            )).pipe(
              map(records =>
                records
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map(r => ({ ...r.data, id: r.serverId ?? r.data?.id } as SavedPresupuesto))
              )
            )
          : of([] as SavedPresupuesto[])
      )
    ),
    { initialValue: [] as SavedPresupuesto[] }
  );

  constructor() {
    effect(() => {
      const userCode = this.empresaStore.userCode();
      if (!userCode) return;
      this._loading.set(true);
      this.svc.cargarPresupuestosPorUserCode(userCode).subscribe({
        next: () => this._loading.set(false),
        error: () => this._loading.set(false)
      });
    }, { allowSignalWrites: true });
  }
}
