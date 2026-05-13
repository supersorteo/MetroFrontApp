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
    toObservable(this.empresaStore.selectedId).pipe(
      switchMap(empresaId =>
        empresaId
          ? from(liveQuery(() =>
              metroDB.clientes
                .filter(r =>
                  !r.deletedAt &&
                  (Number(r.empresaServerId) === empresaId ||
                   Number(r.data?.empresaId) === empresaId)
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
    // Cuando cambia la empresa seleccionada → disparar HTTP en background
    effect(() => {
      const empresaId = this.empresaStore.selectedId();
      if (!empresaId) {
        this._selected.set(null);
        return;
      }
      this._loading.set(true);
      this.svc.getClientesByEmpresaId(empresaId).subscribe({
        next: () => this._loading.set(false),
        error: () => this._loading.set(false)
      });
    }, { allowSignalWrites: true });

    // Cuando cambia la lista, restaurar selección desde localStorage (per-empresa)
    effect(() => {
      const list = this.clientes();
      const empresaId = this.empresaStore.selectedId();
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

      // Preferir clave per-empresa para no mezclar selecciones entre empresas
      const perEmpresaKey = empresaId ? `selectedClienteId_empresa_${empresaId}` : null;
      const savedId =
        (perEmpresaKey && localStorage.getItem(perEmpresaKey)) ||
        localStorage.getItem('selectedClienteId');

      if (pendingSelectedId != null) {
        const pendingMatch = list.find(c => c.id === pendingSelectedId) ?? null;
        if (pendingMatch) {
          this._selected.set(pendingMatch);
          this._pendingSelectedId.set(null);
          if (perEmpresaKey) {
            localStorage.setItem(perEmpresaKey, String(pendingMatch.id));
          }
          return;
        }

        if (pendingSelectedId > 0 && current?.id === pendingSelectedId && current.empresaId === empresaId) {
          return;
        }
      }

      const match = savedId ? list.find(c => String(c.id) === savedId) : null;
      const selected = match ?? list[0] ?? null;
      this._selected.set(selected);
      this._pendingSelectedId.set(null);
      // Persist per-empresa key on auto-restore so future returns use the right client
      if (selected?.id && perEmpresaKey) {
        localStorage.setItem(perEmpresaKey, String(selected.id));
      }
    }, { allowSignalWrites: true });
  }

  select(cliente: Cliente | null): void {
    this._selected.set(cliente);
    this._pendingSelectedId.set(cliente?.id ?? null);
    const empresaId = this.empresaStore.selectedId();
    if (cliente?.id) {
      // Guardar selección tanto globalmente como per-empresa
      localStorage.setItem('selectedClienteId', String(cliente.id));
      if (empresaId) {
        localStorage.setItem(`selectedClienteId_empresa_${empresaId}`, String(cliente.id));
      }
      localStorage.setItem('selectedCliente', JSON.stringify(cliente));
    } else {
      localStorage.removeItem('selectedClienteId');
      localStorage.removeItem('selectedCliente');
    }
  }
}
