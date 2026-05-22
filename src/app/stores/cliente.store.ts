import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from, switchMap, of, map } from 'rxjs';
import { metroDB } from '../servicios/metro-db.service';
import { ClienteService, Cliente } from '../servicios/cliente.service';
import { EmpresaStore } from './empresa.store';

@Injectable({ providedIn: 'root' })
export class ClienteStore {
  private readonly svc = inject(ClienteService);
  private readonly empresaStore = inject(EmpresaStore);

  private readonly _selected = signal<Cliente | null>(null);
  private readonly _pendingSelectedId = signal<number | null>(null);
  private readonly _loading = signal(false);

  readonly loading = this._loading.asReadonly();
  readonly selected = this._selected.asReadonly();
  readonly selectedId = computed(() => {
    const id = this._selected()?.id;
    return typeof id === 'number' ? id : null;
  });

  readonly clientes = toSignal(
    toObservable(this.empresaStore.userCode).pipe(
      switchMap(userCode =>
        userCode
          ? from(liveQuery(() =>
              metroDB.clientes
                .filter(r =>
                  !r.deletedAt &&
                  r.data?.userCode === userCode
                )
                .toArray()
            )).pipe(
              map(records =>
                records
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map(r => ({ ...r.data, id: r.serverId ?? r.data?.id } as Cliente))
              )
            )
          : of([] as Cliente[])
      )
    ),
    { initialValue: [] as Cliente[] }
  );

  constructor() {
    // Cuando cambia el userCode → cargar clientes desde backend en background
    effect(() => {
      const userCode = this.empresaStore.userCode();
      if (!userCode) {
        this._selected.set(null);
        return;
      }
      this._loading.set(true);
      this.svc.getClienteByUserCode(userCode).subscribe({
        next: () => this._loading.set(false),
        error: () => this._loading.set(false)
      });
    }, { allowSignalWrites: true });

    // Cuando cambia la lista, restaurar selección desde localStorage
    effect(() => {
      const list = this.clientes();
      const pendingSelectedId = this._pendingSelectedId();

      const current = this._selected();
      if (current?.id) {
        const fresh = list.find(c => c.id === current.id) ?? null;
        if (fresh) {
          if (JSON.stringify(fresh) !== JSON.stringify(current)) {
            this._selected.set(fresh);
          }
          return;
        }
      }

      if (list.length === 0) {
        this._selected.set(null);
        return;
      }

      if (pendingSelectedId != null) {
        const pendingMatch = list.find(c => c.id === pendingSelectedId) ?? null;
        if (pendingMatch) {
          this._selected.set(pendingMatch);
          this._pendingSelectedId.set(null);
          return;
        }

        if (pendingSelectedId > 0 && current?.id === pendingSelectedId) {
          return;
        }
      }

      const savedId = localStorage.getItem('selectedClienteId');
      const match = savedId ? list.find(c => String(c.id) === savedId) : null;
      this._selected.set(match ?? list[0] ?? null);
      this._pendingSelectedId.set(null);
    }, { allowSignalWrites: true });
  }

  select(cliente: Cliente | null): void {
    this._selected.set(cliente);
    this._pendingSelectedId.set(cliente?.id ?? null);
    if (cliente?.id) {
      localStorage.setItem('selectedClienteId', String(cliente.id));
      localStorage.setItem('selectedCliente', JSON.stringify(cliente));
    } else {
      localStorage.removeItem('selectedClienteId');
      localStorage.removeItem('selectedCliente');
    }
  }
}
