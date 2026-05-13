import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from, switchMap, of, map } from 'rxjs';
import { metroDB } from '../servicios/metro-db.service';
import { EmpresaService, Empresa } from '../servicios/empresa.service';

@Injectable({ providedIn: 'root' })
export class EmpresaStore {
  private readonly svc = inject(EmpresaService);

  private readonly _userCode = signal<string>('');
  private readonly _selected = signal<Empresa | null>(null);
  private readonly _pendingSelectedId = signal<number | null>(null);
  private readonly _loading = signal(false);

  readonly loading = this._loading.asReadonly();
  readonly selected = this._selected.asReadonly();
  readonly selectedId = computed(() => {
    const id = this._selected()?.id;
    return typeof id === 'number' ? id : null;
  });

  readonly empresas = toSignal(
    toObservable(this._userCode).pipe(
      switchMap(userCode =>
        userCode
          ? from(liveQuery(() =>
              metroDB.empresas
                .where('userCode').equals(userCode)
                .filter(r => !r.deletedAt)
                .toArray()
            )).pipe(
              map(records =>
                records
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map(r => ({ ...r.data, id: r.serverId ?? r.data?.id } as Empresa))
              )
            )
          : of([] as Empresa[])
      )
    ),
    { initialValue: [] as Empresa[] }
  );

  constructor() {
    // Cuando cambia la lista, restaurar selección desde localStorage
    effect(() => {
      const list = this.empresas();
      const pendingSelectedId = this._pendingSelectedId();

      const current = this._selected();
      if (current?.id) {
        const fresh = list.find(e => e.id === current.id) ?? null;
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
        const pendingMatch = list.find(e => e.id === pendingSelectedId) ?? null;
        if (pendingMatch) {
          this._selected.set(pendingMatch);
          this._pendingSelectedId.set(null);
          return;
        }

        if (pendingSelectedId > 0 && current?.id === pendingSelectedId) {
          return;
        }
      }

      const savedId = localStorage.getItem('selectedEmpresaId');
      const match = savedId ? list.find(e => String(e.id) === savedId) : null;
      this._selected.set(match ?? list[0] ?? null);
      this._pendingSelectedId.set(null);
    }, { allowSignalWrites: true });
  }

  init(userCode: string): void {
    if (this._userCode() === userCode) return;
    this._userCode.set(userCode);
    this._loading.set(true);
    // IDB liveQuery ya muestra datos al instante.
    // HTTP corre en background y actualiza IDB, liveQuery reacciona solo.
    this.svc.getEmpresaByUserCode(userCode).subscribe({
      next: () => this._loading.set(false),
      error: () => this._loading.set(false)
    });
  }

  select(empresa: Empresa | null): void {
    this._selected.set(empresa);
    this._pendingSelectedId.set(empresa?.id ?? null);
    if (empresa?.id) {
      localStorage.setItem('selectedEmpresaId', String(empresa.id));
      localStorage.setItem('selectedEmpresa', JSON.stringify(empresa));
    } else {
      localStorage.removeItem('selectedEmpresaId');
      localStorage.removeItem('selectedEmpresa');
    }
  }

  refreshFromRemote(): void {
    const userCode = this._userCode();
    if (!userCode) return;
    this._loading.set(true);
    this.svc.getEmpresaByUserCode(userCode).subscribe({
      next: () => this._loading.set(false),
      error: () => this._loading.set(false)
    });
  }
}
