import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { metroDB, PendingOp, EntityType, OperationType } from './metro-db.service';
import { AppToastService } from './app-toast.service';

@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  readonly hasPendingOps = signal<boolean>(false);
  readonly isSyncing = signal<boolean>(false);

  private syncInProgress = false;

  constructor(
    private http: HttpClient,
    private toast: AppToastService
  ) {
    this.refreshPendingCount();
    window.addEventListener('online', () => this.syncPendingOps());
  }

  async addToQueue(
    entity: EntityType,
    operation: OperationType,
    payload: any,
    endpoint: string,
    method: 'POST' | 'PUT' | 'DELETE'
  ): Promise<void> {
    const op: Omit<PendingOp, 'id'> = {
      idempotencyKey: crypto.randomUUID(),
      sequence: Date.now(),
      entity,
      operation,
      payload,
      endpoint,
      method,
      clientTimestamp: Date.now(),
      retries: 0
    };
    await metroDB.pendingOps.add(op as PendingOp);
    this.hasPendingOps.set(true);
  }

  async syncPendingOps(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) return;
    const ops = await metroDB.pendingOps.orderBy('sequence').toArray();
    if (ops.length === 0) return;

    this.syncInProgress = true;
    this.isSyncing.set(true);

    let synced = 0;
    let failed = 0;

    for (const op of ops) {
      if (op.retries >= 3) {
        failed++;
        continue;
      }
      try {
        await firstValueFrom(
          this.http.request(op.method, op.endpoint, {
            body: op.method !== 'DELETE' ? op.payload : undefined
          })
        );
        await metroDB.pendingOps.delete(op.id!);
        synced++;
      } catch (error: any) {
        if (error?.status === 401) {
          this.toast.warning(
            'Tu sesión expiró. Iniciá sesión nuevamente para sincronizar los cambios pendientes.',
            'Sesión expirada'
          );
          break;
        }
        await metroDB.pendingOps.update(op.id!, {
          retries: op.retries + 1,
          errorMessage: error?.message || 'Error desconocido'
        });
        failed++;
      }
    }

    this.syncInProgress = false;
    this.isSyncing.set(false);
    await this.refreshPendingCount();

    if (synced > 0) {
      const s = synced > 1;
      this.toast.success(
        `${synced} cambio${s ? 's' : ''} sincronizado${s ? 's' : ''} correctamente.`,
        'Sincronización completa'
      );
    }
    if (failed > 0) {
      const s = failed > 1;
      this.toast.warning(
        `${failed} cambio${s ? 's' : ''} no pudo${s ? 'ron' : ''} sincronizarse y se reintentará automáticamente.`,
        'Sync parcial'
      );
    }
  }

  async cacheEmpresa(userCode: string, data: any): Promise<void> {
    await metroDB.cachedEmpresas.put({ userCode, data, cachedAt: Date.now() });
  }

  async getCachedEmpresa(userCode: string): Promise<any | null> {
    const cached = await metroDB.cachedEmpresas.get(userCode);
    return cached?.data ?? null;
  }

  async cacheClientes(empresaId: number, data: any[]): Promise<void> {
    await metroDB.cachedClientes.put({ empresaId, data, cachedAt: Date.now() });
  }

  async getCachedClientes(empresaId: number): Promise<any[] | null> {
    const cached = await metroDB.cachedClientes.get(empresaId);
    return cached?.data ?? null;
  }

  async cacheCalculos(userCode: string, historial: any[], ultimasTareas: any[]): Promise<void> {
    await metroDB.cachedCalculos.put({ userCode, historial, ultimasTareas, cachedAt: Date.now() });
  }

  async getCachedCalculos(userCode: string): Promise<{ historial: any[]; ultimasTareas: any[] } | null> {
    const cached = await metroDB.cachedCalculos.get(userCode);
    return cached ? { historial: cached.historial, ultimasTareas: cached.ultimasTareas } : null;
  }

  private async refreshPendingCount(): Promise<void> {
    const count = await metroDB.pendingOps.count();
    this.hasPendingOps.set(count > 0);
  }
}
