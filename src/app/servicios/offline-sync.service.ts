import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { metroDB, PendingOp, EntityType, OperationType } from './metro-db.service';
import { AppToastService } from './app-toast.service';
import { APP_API_URL } from '../core/api/api.config';
import { OfflineLocalStoreService } from './offline-local-store.service';
import { OfflineStatusService } from './offline-status.service';

export interface PendingSyncSummary {
  total: number;
  empresa: number;
  cliente: number;
  userTarea: number;
  presupuesto: number;
  calculoMaterial: number;
  empresaLogo: number;
}

@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  readonly hasPendingOps = signal<boolean>(false);
  readonly pendingOpsCount = signal<number>(0);
  readonly isSyncing = signal<boolean>(false);

  private readonly uploadUrl = `${APP_API_URL}/upload/image`;
  private syncInProgress = false;
  private sequenceSeed = Date.now();

  constructor(
    private http: HttpClient,
    private toast: AppToastService,
    private localStore: OfflineLocalStoreService,
    private offlineStatus: OfflineStatusService
  ) {
    this.refreshPendingCount();
    // Delay after 'online' event: network isn't stable the instant the event fires
    window.addEventListener('online', () => {
      setTimeout(() => void this.syncPendingOpsIfOnline(), 2500);
    });
    window.addEventListener('focus', () => void this.syncPendingOpsIfOnline());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.syncPendingOpsIfOnline();
    });
    setTimeout(() => void this.syncPendingOpsIfOnline(), 1200);
  }

  private async syncPendingOpsIfOnline(): Promise<void> {
    if (!this.hasPendingOps()) {
      return;
    }
    const reallyOnline = await this.offlineStatus.probe();
    if (reallyOnline) {
      await this.resetNetworkErrorRetries();
      void this.syncPendingOps();
    }
  }

  private async resetNetworkErrorRetries(): Promise<void> {
    const ops = await metroDB.pendingOps
      .filter(op => op.retries > 0 && this.isNetworkErrorMessage(op.errorMessage))
      .toArray();
    for (const op of ops) {
      if (op.id) await metroDB.pendingOps.update(op.id, { retries: 0, errorMessage: undefined });
    }
  }

  private isNetworkErrorMessage(msg?: string): boolean {
    if (!msg) return false;
    return msg.includes('0 Client Error') || msg.includes('unknown url') || msg.includes('Http failure response');
  }

  async addToQueue(
    entity: EntityType,
    operation: OperationType,
    payload: any,
    endpoint: string,
    method: 'POST' | 'PUT' | 'DELETE'
  ): Promise<void> {
    const sequence = this.nextSequence();
    const op: Omit<PendingOp, 'id'> = {
      idempotencyKey: crypto.randomUUID(),
      sequence,
      entity,
      operation,
      payload,
      endpoint,
      method,
      clientTimestamp: sequence,
      retries: 0
    };
    await metroDB.pendingOps.add(op as PendingOp);
    await this.refreshPendingCount();
  }

  async queueEmpresaLogoUpload(fileDataUrl: string, userCode: string, empresaId?: number): Promise<void> {
    const existing = await metroDB.pendingOps
      .where('entity')
      .equals('empresa-logo')
      .filter(op =>
        op.operation === 'upload' &&
        op.payload?.fileDataUrl === fileDataUrl &&
        op.payload?.userCode === userCode
      )
      .first();

    if (existing?.id) {
      return;
    }

    await this.addToQueue(
      'empresa-logo',
      'upload',
      { fileDataUrl, userCode, empresaId: empresaId ?? null },
      this.uploadUrl,
      'POST'
    );
  }

  async syncPendingOps(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) return;
    const ops = await metroDB.pendingOps.orderBy('sequence').toArray();
    if (ops.length === 0) return;


    this.syncInProgress = true;
    this.isSyncing.set(true);

    let synced = 0;
    let failed = 0;

    for (const queuedOp of ops) {
      const op = queuedOp.id ? await metroDB.pendingOps.get(queuedOp.id) : queuedOp;
      if (!op?.id) {
        continue;
      }

      if (op.retries >= 3) {
        failed++;
        continue;
      }
      try {
        const specialHandled = await this.processSpecialOperation(op);
        if (specialHandled) {
          await metroDB.pendingOps.delete(op.id!);
          synced++;
          continue;
        }

        const body =
          op.method === 'DELETE'
            ? undefined
            : op.method === 'POST' && Number(op.payload?.id) < 0
              ? { ...op.payload, id: undefined }
              : op.payload;

        const response = await firstValueFrom(
          this.http.request(op.method, op.endpoint, {
            body
          })
        );
        await this.reconcileLocalStore(op, response);
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
        // DELETE 404 = ya fue eliminado en el servidor, operacion cumplida
        if (op.method === 'DELETE' && error?.status === 404) {
          await metroDB.pendingOps.delete(op.id!);
          synced++;
          continue;
        }
        // Status 0 = error de red (offline, cold start). No consumir retries: se reintentará al volver online
        if ([0, 502, 503, 504].includes(Number(error?.status)) || !navigator.onLine) {
          failed++;
          continue;
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
    const localEmpresas = await metroDB.empresas
      .where('userCode')
      .equals(userCode)
      .filter(record => !record.deletedAt)
      .toArray();

    const latest = localEmpresas.sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (latest?.data && (!cached || latest.updatedAt >= cached.cachedAt)) {
      return { ...latest.data, id: latest.serverId ?? latest.data?.id };
    }

    return cached?.data ?? null;
  }

  async cacheClientes(empresaId: number, data: any[]): Promise<void> {
    await metroDB.cachedClientes.put({ empresaId, data, cachedAt: Date.now() });
  }

  async getCachedClientes(empresaId: number): Promise<any[] | null> {
    const cached = await metroDB.cachedClientes.get(empresaId);
    const cachedData = Array.isArray(cached?.data) ? cached.data : [];

    const localClientes = await metroDB.clientes
      .filter(record =>
        !record.deletedAt &&
        (
          Number(record.empresaServerId) === empresaId ||
          Number(record.data?.empresaId) === empresaId
        )
      )
      .toArray();

    if (localClientes.length === 0 && cachedData.length === 0) {
      return null;
    }

    return this.mergeById([
      ...cachedData,
      ...localClientes
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(record => ({ ...record.data, id: record.serverId ?? record.data?.id }))
    ]);
  }

  async cacheCalculos(userCode: string, historial: any[], ultimasTareas: any[]): Promise<void> {
    await metroDB.cachedCalculos.put({ userCode, historial, ultimasTareas, cachedAt: Date.now() });
  }

  async getCachedCalculos(userCode: string): Promise<{ historial: any[]; ultimasTareas: any[] } | null> {
    const cached = await metroDB.cachedCalculos.get(userCode);
    return cached ? { historial: cached.historial, ultimasTareas: cached.ultimasTareas } : null;
  }

  async cacheUserTareas(cacheKey: string, data: any[]): Promise<void> {
    await metroDB.cachedUserTareas.put({ cacheKey, data, cachedAt: Date.now() });
  }

  async getCachedUserTareas(cacheKey: string): Promise<any[] | null> {
    const cached = await metroDB.cachedUserTareas.get(cacheKey);
    const cachedData = Array.isArray(cached?.data) ? cached.data : [];

    if (cacheKey.startsWith('cliente:')) {
      const clienteId = Number(cacheKey.replace('cliente:', ''));
      const localTareas = await metroDB.userTareas
        .filter(record =>
          !record.deletedAt &&
          (
            Number(record.clienteServerId) === clienteId ||
            Number(record.data?.clienteId) === clienteId
          )
        )
        .toArray();

      const localData = localTareas
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map(record => ({ ...record.data, id: record.serverId ?? record.data?.id }));
      const merged = this.mergeById([...cachedData, ...localData]);
      return merged.length > 0 ? merged : null;
    }

    if (cacheKey.startsWith('user:')) {
      const userCode = cacheKey.replace('user:', '');
      const localTareas = await metroDB.userTareas
        .where('userCode')
        .equals(userCode)
        .filter(record => !record.deletedAt)
        .toArray();

      const localData = localTareas
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map(record => ({ ...record.data, id: record.serverId ?? record.data?.id }));
      const merged = this.mergeById([...cachedData, ...localData]);
      return merged.length > 0 ? merged : null;
    }

    return cachedData.length > 0 ? cachedData : null;
  }

  private mergeById<T extends { id?: unknown }>(items: T[]): T[] {
    const byId = new Map<string, T>();
    for (const item of items) {
      const key = String(item?.id ?? crypto.randomUUID());
      byId.set(key, item);
    }
    return [...byId.values()];
  }

  async replacePendingCreatePayload(entity: EntityType, tempId: number, payload: any): Promise<boolean> {
    const pendingCreate = await metroDB.pendingOps
      .where('entity')
      .equals(entity)
      .filter(op => op.operation === 'create' && Number(op.payload?.id) === tempId)
      .first();

    if (!pendingCreate?.id) {
      return false;
    }

    await metroDB.pendingOps.update(pendingCreate.id, {
      payload,
      clientTimestamp: Date.now()
    });
    return true;
  }

  async removePendingCreate(entity: EntityType, tempId: number): Promise<boolean> {
    const pendingCreate = await metroDB.pendingOps
      .where('entity')
      .equals(entity)
      .filter(op => op.operation === 'create' && Number(op.payload?.id) === tempId)
      .first();

    if (!pendingCreate?.id) {
      return false;
    }

    await metroDB.pendingOps.delete(pendingCreate.id);
    await this.refreshPendingCount();
    return true;
  }

  async getPendingSummary(): Promise<PendingSyncSummary> {
    const ops = await metroDB.pendingOps.toArray();

    return {
      total: ops.length,
      empresa: ops.filter(op => op.entity === 'empresa').length,
      cliente: ops.filter(op => op.entity === 'cliente').length,
      userTarea: ops.filter(op => op.entity === 'user-tarea').length,
      presupuesto: ops.filter(op => op.entity === 'presupuesto').length,
      calculoMaterial: ops.filter(op => op.entity === 'calculo-material').length,
      empresaLogo: ops.filter(op => op.entity === 'empresa-logo').length
    };
  }

  private async processSpecialOperation(op: PendingOp): Promise<boolean> {
    if (op.entity !== 'empresa-logo' || op.operation !== 'upload') {
      return false;
    }

    const fileDataUrl = String(op.payload?.fileDataUrl || '');
    const userCode = String(op.payload?.userCode || '');
    const empresaId = Number(op.payload?.empresaId);

    if (!fileDataUrl || !userCode) {
      throw new Error('No se encontro la imagen pendiente para sincronizar.');
    }

    const formData = new FormData();
    formData.append('files', this.dataUrlToFile(fileDataUrl, `logo-${Date.now()}.png`));
    formData.append('userCode', userCode);

    const response = await firstValueFrom(
      this.http.post<{ urls: string[] }>(this.uploadUrl, formData)
    );

    const uploadedUrl = response?.urls?.[0];
    if (!uploadedUrl) {
      throw new Error('El backend no devolvio una URL para el logo.');
    }

    await this.replaceLogoReferences(fileDataUrl, uploadedUrl, userCode, empresaId);
    return true;
  }

  private async reconcileLocalStore(op: PendingOp, response: unknown): Promise<void> {
    if (op.operation === 'delete') {
      await this.reconcileDelete(op);
      return;
    }

    const remoteData = this.extractRemotePayload(response, op.payload);
    const localId = Number(op.payload?.id ?? remoteData?.id);

    if (op.operation === 'create') {
      await this.replaceTempReferences(op.entity, localId, Number(remoteData?.id));
    }

    switch (op.entity) {
      case 'empresa':
        await this.localStore.markEmpresaSynced(localId, remoteData);
        break;
      case 'cliente':
        await this.localStore.markClienteSynced(localId, remoteData);
        break;
      case 'user-tarea':
        await this.localStore.markUserTareaSynced(localId, remoteData);
        break;
      case 'presupuesto':
        await this.localStore.markPresupuestoSynced(localId, remoteData);
        break;
    }
  }

  private async reconcileDelete(op: PendingOp): Promise<void> {
    const id = Number(op.payload?.id ?? op.payload?.calculoId);
    if (!Number.isFinite(id)) {
      return;
    }

    switch (op.entity) {
      case 'empresa':
        await this.localStore.markEmpresaDeleteSynced(id);
        break;
      case 'cliente':
        await this.localStore.markClienteDeleteSynced(id);
        break;
      case 'user-tarea':
        await this.localStore.markUserTareaDeleteSynced(id);
        break;
      case 'presupuesto':
        await this.localStore.markPresupuestoDeleteSynced(id);
        break;
    }
  }

  private extractRemotePayload(response: unknown, fallback: any): any {
    if (response && typeof response === 'object') {
      return response;
    }

    return fallback;
  }

  private async replaceTempReferences(entity: EntityType, tempId: number, serverId: number): Promise<void> {
    if (!Number.isFinite(tempId) || !Number.isFinite(serverId) || tempId >= 0 || serverId <= 0) {
      return;
    }

    const ops = await metroDB.pendingOps.toArray();
    for (const pending of ops) {
      if (!pending.id || pending.entity === entity && Number(pending.payload?.id) === tempId) {
        continue;
      }

      const nextPayload = this.replaceEntityReference(pending.payload, entity, tempId, serverId);
      if (nextPayload !== pending.payload) {
        await metroDB.pendingOps.update(pending.id, {
          payload: nextPayload,
          clientTimestamp: Date.now()
        });
      }
    }

    if (entity === 'empresa') {
      await this.localStore.relinkEmpresaImageBlobs(tempId, serverId);
    }
  }

  private replaceEntityReference(value: any, entity: EntityType, tempId: number, serverId: number): any {
    if (Array.isArray(value)) {
      let changed = false;
      const next = value.map(item => {
        const replaced = this.replaceEntityReference(item, entity, tempId, serverId);
        changed ||= replaced !== item;
        return replaced;
      });
      return changed ? next : value;
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    let changed = false;
    const next: Record<string, any> = { ...value };
    const referenceKeys = this.referenceKeysForEntity(entity);

    for (const key of Object.keys(next)) {
      if (referenceKeys.includes(key) && Number(next[key]) === tempId) {
        next[key] = serverId;
        changed = true;
        continue;
      }

      const replaced = this.replaceEntityReference(next[key], entity, tempId, serverId);
      if (replaced !== next[key]) {
        next[key] = replaced;
        changed = true;
      }
    }

    return changed ? next : value;
  }

  private referenceKeysForEntity(entity: EntityType): string[] {
    switch (entity) {
      case 'empresa':
        return ['empresaId', 'empresaServerId', 'ownerServerId'];
      case 'cliente':
        return ['clienteId', 'clienteServerId'];
      case 'user-tarea':
        return ['tareaId', 'userTareaId', 'id'];
      case 'presupuesto':
        return ['presupuestoId'];
      default:
        return [];
    }
  }

  private async replaceLogoReferences(
    previousValue: string,
    uploadedUrl: string,
    userCode: string,
    empresaId: number
  ): Promise<void> {
    const empresaOps = await metroDB.pendingOps
      .where('entity')
      .equals('empresa')
      .toArray();

    for (const op of empresaOps) {
      if (!op.id || !op.payload || op.payload.logoUrl !== previousValue) {
        continue;
      }

      await metroDB.pendingOps.update(op.id, {
        payload: {
          ...op.payload,
          logoUrl: uploadedUrl
        },
        clientTimestamp: Date.now()
      });
    }

    const cachedEmpresa = await metroDB.cachedEmpresas.get(userCode);
    if (cachedEmpresa?.data) {
      await metroDB.cachedEmpresas.put({
        ...cachedEmpresa,
        data: {
          ...cachedEmpresa.data,
          logoUrl: uploadedUrl
        },
        cachedAt: Date.now()
      });
    }

    await this.localStore.replaceEmpresaLogoReference({
      previousValue,
      uploadedUrl,
      userCode,
      empresaId: Number.isFinite(empresaId) ? empresaId : undefined
    });

    this.updateStoredEmpresaLogo(previousValue, uploadedUrl, userCode, empresaId);
    localStorage.setItem('uploadedImage', uploadedUrl);
  }

  private updateStoredEmpresaLogo(
    previousValue: string,
    uploadedUrl: string,
    userCode: string,
    empresaId: number
  ): void {
    const selectedEmpresaRaw = localStorage.getItem('selectedEmpresa');
    if (selectedEmpresaRaw) {
      try {
        const selectedEmpresa = JSON.parse(selectedEmpresaRaw);
        const sameEmpresa =
          Number.isFinite(empresaId) &&
          empresaId > 0 &&
          Number(selectedEmpresa?.id) === empresaId;

        if (sameEmpresa || selectedEmpresa?.logoUrl === previousValue) {
          const updated = { ...selectedEmpresa, logoUrl: uploadedUrl };
          localStorage.setItem('selectedEmpresa', JSON.stringify(updated));
          if (updated?.id) {
            localStorage.setItem('selectedEmpresaId', String(updated.id));
          }
        }
      } catch {
      }
    }
  }

  private dataUrlToFile(dataUrl: string, filename: string): File {
    const [metadata, content] = dataUrl.split(',');
    if (!metadata || !content) {
      throw new Error('Formato de imagen local invalido.');
    }

    const mimeMatch = metadata.match(/data:(.*?);base64/);
    const mime = mimeMatch?.[1] || 'image/png';
    const binary = atob(content);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new File([bytes], filename, { type: mime });
  }

  private nextSequence(): number {
    this.sequenceSeed = Math.max(this.sequenceSeed + 1, Date.now());
    return this.sequenceSeed;
  }

  private async refreshPendingCount(): Promise<void> {
    const count = await metroDB.pendingOps.count();
    this.pendingOpsCount.set(count);
    this.hasPendingOps.set(count > 0);
  }
}

