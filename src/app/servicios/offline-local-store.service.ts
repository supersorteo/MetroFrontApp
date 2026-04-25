import { Injectable } from '@angular/core';
import {
  EntityType,
  LocalCliente,
  LocalEmpresa,
  LocalImageBlob,
  LocalPresupuesto,
  LocalUserTarea,
  SyncStatus,
  metroDB
} from './metro-db.service';

type LocalEntity = LocalEmpresa | LocalCliente | LocalUserTarea | LocalPresupuesto;

@Injectable({ providedIn: 'root' })
export class OfflineLocalStoreService {
  async upsertEmpresa(data: any, syncStatus: SyncStatus = 'synced'): Promise<LocalEmpresa> {
    const serverId = this.toServerId(data?.id);
    const existing = serverId
      ? await metroDB.empresas.where('serverId').equals(serverId).first()
      : await metroDB.empresas.filter(record => Number(record.data?.id) === Number(data?.id)).first();

    const record: LocalEmpresa = {
      localId: existing?.localId ?? this.resolveLocalId('empresa', data?.localId, serverId),
      serverId,
      userCode: String(data?.userCode || existing?.userCode || ''),
      data,
      syncStatus,
      updatedAt: Date.now()
    };

    await metroDB.empresas.put(record);
    return record;
  }

  async listEmpresas(userCode: string): Promise<any[]> {
    const records = await metroDB.empresas
      .where('userCode')
      .equals(userCode)
      .filter(record => !record.deletedAt)
      .toArray();

    return this.sortByUpdated(records).map(record => this.withResolvedId(record));
  }

  async getEmpresaByServerId(id: number): Promise<any | null> {
    const record = await metroDB.empresas.where('serverId').equals(id).first();
    return record && !record.deletedAt ? this.withResolvedId(record) : null;
  }

  async getEmpresaByLocalOrServerId(id: number): Promise<any | null> {
    const record = await this.findEmpresaByAnyId(id);
    return record && !record.deletedAt ? this.withResolvedId(record) : null;
  }

  async markEmpresaDeleted(id: number, syncStatus: SyncStatus = 'pending'): Promise<void> {
    const record = id > 0
      ? await metroDB.empresas.where('serverId').equals(id).first()
      : await metroDB.empresas.filter(item => Number(item.data?.id) === id).first();
    if (record) {
      await metroDB.empresas.update(record.localId, {
        deletedAt: Date.now(),
        syncStatus,
        updatedAt: Date.now()
      });
    }
  }

  async markEmpresaSynced(localOrServerId: number, remoteData?: any): Promise<void> {
    const serverId = this.toServerId(remoteData?.id);
    const localRecord = await this.findEmpresaByStoredId(localOrServerId);
    const serverRecord = serverId
      ? await metroDB.empresas.where('serverId').equals(serverId).first()
      : undefined;
    const record = localRecord ?? serverRecord ?? await this.findEmpresaByAnyId(localOrServerId, remoteData?.id);

    if (!record) {
      if (remoteData) {
        await this.upsertEmpresa(remoteData, 'synced');
      }
      return;
    }

    const resolvedServerId = serverId ?? record.serverId;
    await metroDB.empresas.put({
      ...record,
      serverId: resolvedServerId,
      data: {
        ...(serverRecord?.data || {}),
        ...(localRecord?.data || {}),
        ...record.data,
        ...remoteData,
        id: resolvedServerId ?? record.data?.id
      },
      syncStatus: 'synced',
      updatedAt: Date.now(),
      deletedAt: undefined
    });

    if (Number.isFinite(localOrServerId) && localOrServerId < 0 && Number.isFinite(resolvedServerId)) {
      await this.relinkClientesForEmpresaSync(localOrServerId, Number(resolvedServerId));
      this.updateStoredSelectedEmpresa(localOrServerId, Number(resolvedServerId), remoteData);
    }

    if (localRecord && serverRecord && localRecord.localId !== serverRecord.localId) {
      await metroDB.empresas.delete(serverRecord.localId);
    }
  }

  async markEmpresaDeleteSynced(id: number): Promise<void> {
    const record = await this.findEmpresaByAnyId(id);
    if (record) {
      await metroDB.empresas.delete(record.localId);
    }
  }

  async replaceEmpresaLogoReference(params: {
    previousValue: string;
    uploadedUrl: string;
    userCode: string;
    empresaId?: number;
  }): Promise<void> {
    const records = await metroDB.empresas
      .where('userCode')
      .equals(params.userCode)
      .filter(record =>
        !record.deletedAt &&
        (
          (Number.isFinite(params.empresaId) && Number(record.serverId ?? record.data?.id) === params.empresaId) ||
          (!Number.isFinite(params.empresaId) && record.data?.logoUrl === params.previousValue)
        )
      )
      .toArray();

    for (const record of records) {
      await metroDB.empresas.put({
        ...record,
        data: {
          ...record.data,
          logoUrl: params.uploadedUrl
        },
        updatedAt: Date.now()
      });
    }

    const imageRecords = await metroDB.imageBlobs
      .where('userCode')
      .equals(params.userCode)
      .filter(record =>
        record.syncStatus !== 'synced' &&
        (
          (Number.isFinite(params.empresaId) && Number(record.ownerServerId) === params.empresaId) ||
          (!Number.isFinite(params.empresaId) && record.remoteUrl === params.previousValue)
        )
      )
      .toArray();

    for (const record of imageRecords) {
      await metroDB.imageBlobs.put({
        ...record,
        remoteUrl: params.uploadedUrl,
        syncStatus: 'synced',
        updatedAt: Date.now()
      });
    }
  }

  async relinkEmpresaImageBlobs(tempEmpresaId: number, serverEmpresaId: number, userCode?: string): Promise<void> {
    if (!Number.isFinite(tempEmpresaId) || !Number.isFinite(serverEmpresaId)) {
      return;
    }

    const records = await metroDB.imageBlobs
      .where('ownerEntity')
      .equals('empresa-logo')
      .filter(record =>
        Number(record.ownerServerId) === tempEmpresaId &&
        (!userCode || record.userCode === userCode)
      )
      .toArray();

    for (const record of records) {
      await metroDB.imageBlobs.put({
        ...record,
        ownerServerId: serverEmpresaId,
        updatedAt: Date.now()
      });
    }
  }

  async getEmpresaLogoUrl(params: {
    empresaId?: number;
    userCode?: string;
    currentLogoUrl?: string;
  }): Promise<string | null> {
    const currentLogoUrl = String(params.currentLogoUrl || '');
    if (currentLogoUrl.startsWith('data:image/')) {
      return currentLogoUrl;
    }

    const allRecords = await metroDB.imageBlobs
      .where('ownerEntity')
      .equals('empresa-logo')
      .filter(record =>
        !params.userCode || record.userCode === params.userCode
      )
      .toArray();

    const records = Number.isFinite(params.empresaId)
      ? allRecords.filter(record => Number(record.ownerServerId) === Number(params.empresaId))
      : [];

    const fallbackRecords = records.length === 0 && !!currentLogoUrl
      ? allRecords.filter(record => record.remoteUrl === currentLogoUrl)
      : records;

    const latest = fallbackRecords.sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (!latest?.blob) {
      return null;
    }

    return this.readBlobAsDataUrl(latest.blob);
  }

  async hasEmpresaLogoBlob(params: {
    empresaId?: number;
    userCode?: string;
    currentLogoUrl?: string;
  }): Promise<boolean> {
    const currentLogoUrl = String(params.currentLogoUrl || '');
    if (currentLogoUrl.startsWith('data:image/')) {
      return true;
    }

    const allRecords = await metroDB.imageBlobs
      .where('ownerEntity')
      .equals('empresa-logo')
      .filter(record =>
        !params.userCode || record.userCode === params.userCode
      )
      .toArray();

    const records = Number.isFinite(params.empresaId)
      ? allRecords.filter(record => Number(record.ownerServerId) === Number(params.empresaId))
      : [];

    const fallbackRecords = records.length === 0 && !!currentLogoUrl
      ? allRecords.filter(record => record.remoteUrl === currentLogoUrl)
      : records;

    return fallbackRecords.some(record => !!record.blob);
  }

  async upsertCliente(data: any, syncStatus: SyncStatus = 'synced'): Promise<LocalCliente> {
    const serverId = this.toServerId(data?.id);
    const existing = serverId
      ? await metroDB.clientes.where('serverId').equals(serverId).first()
      : await metroDB.clientes.filter(record => Number(record.data?.id) === Number(data?.id)).first();

    const record: LocalCliente = {
      localId: existing?.localId ?? this.resolveLocalId('cliente', data?.localId, serverId),
      serverId,
      empresaLocalId: data?.empresaLocalId ?? existing?.empresaLocalId ?? this.localRef('empresa', data?.empresaId),
      empresaServerId: this.toServerId(data?.empresaId ?? data?.empresaServerId) ?? existing?.empresaServerId,
      userCode: String(data?.userCode || existing?.userCode || ''),
      data,
      syncStatus,
      updatedAt: Date.now()
    };

    await metroDB.clientes.put(record);
    return record;
  }

  async listClientesByEmpresaId(empresaId: number): Promise<any[]> {
    const records = await metroDB.clientes
      .filter(record =>
        !record.deletedAt &&
        (
          Number(record.empresaServerId) === empresaId ||
          Number(record.data?.empresaId) === empresaId ||
          record.empresaLocalId === this.localRef('empresa', empresaId)
        )
      )
      .toArray();

    return this.sortByUpdated(records).map(record => this.withResolvedId(record));
  }

  async listClientesByUserCode(userCode: string): Promise<any[]> {
    const records = await metroDB.clientes
      .where('userCode')
      .equals(userCode)
      .filter(record => !record.deletedAt)
      .toArray();

    return this.sortByUpdated(records).map(record => this.withResolvedId(record));
  }

  async getClienteByServerId(id: number): Promise<any | null> {
    const record = await metroDB.clientes.where('serverId').equals(id).first();
    return record && !record.deletedAt ? this.withResolvedId(record) : null;
  }

  async getClienteByLocalOrServerId(id: number): Promise<any | null> {
    const record = await this.findClienteByAnyId(id);
    return record && !record.deletedAt ? this.withResolvedId(record) : null;
  }

  async markClienteDeleted(id: number, syncStatus: SyncStatus = 'pending'): Promise<void> {
    const record = id > 0
      ? await metroDB.clientes.where('serverId').equals(id).first()
      : await metroDB.clientes.filter(item => Number(item.data?.id) === id).first();
    if (record) {
      await metroDB.clientes.update(record.localId, {
        deletedAt: Date.now(),
        syncStatus,
        updatedAt: Date.now()
      });
    }
  }

  async markClienteSynced(localOrServerId: number, remoteData?: any): Promise<void> {
    const record = await this.findClienteByAnyId(localOrServerId, remoteData?.id);
    if (!record) {
      if (remoteData) {
        await this.upsertCliente(remoteData, 'synced');
      }
      return;
    }

    const serverId = this.toServerId(remoteData?.id) ?? record.serverId;
    const empresaServerId = this.toServerId(remoteData?.empresaId ?? remoteData?.empresaServerId) ?? record.empresaServerId;
    await metroDB.clientes.put({
      ...record,
      serverId,
      empresaServerId,
      data: { ...record.data, ...remoteData, id: serverId ?? record.data?.id },
      syncStatus: 'synced',
      updatedAt: Date.now(),
      deletedAt: undefined
    });

    if (Number.isFinite(localOrServerId) && localOrServerId < 0 && Number.isFinite(serverId)) {
      this.updateStoredSelectedCliente(localOrServerId, Number(serverId), {
        ...record.data,
        ...remoteData,
        id: serverId,
        empresaId: remoteData?.empresaId ?? remoteData?.empresaServerId ?? record.data?.empresaId
      });
    }
  }

  async markClienteDeleteSynced(id: number): Promise<void> {
    const record = await this.findClienteByAnyId(id);
    if (record) {
      await metroDB.clientes.delete(record.localId);
    }
  }

  async upsertUserTarea(data: any, syncStatus: SyncStatus = 'synced'): Promise<LocalUserTarea> {
    const serverId = this.toServerId(data?.id);
    const existing = serverId
      ? await metroDB.userTareas.where('serverId').equals(serverId).first()
      : await metroDB.userTareas.filter(record => Number(record.data?.id) === Number(data?.id)).first();

    const record: LocalUserTarea = {
      localId: existing?.localId ?? this.resolveLocalId('user-tarea', data?.localId, serverId),
      serverId,
      clienteLocalId: data?.clienteLocalId ?? existing?.clienteLocalId ?? this.localRef('cliente', data?.clienteId),
      clienteServerId: this.toServerId(data?.clienteId ?? data?.clienteServerId) ?? existing?.clienteServerId,
      userCode: data?.userCode ?? existing?.userCode,
      data,
      syncStatus,
      updatedAt: Date.now()
    };

    await metroDB.userTareas.put(record);
    return record;
  }

  async listUserTareasByClienteId(clienteId: number): Promise<any[]> {
    const records = await metroDB.userTareas
      .filter(record =>
        !record.deletedAt &&
        (
          Number(record.clienteServerId) === clienteId ||
          Number(record.data?.clienteId) === clienteId ||
          record.clienteLocalId === this.localRef('cliente', clienteId)
        )
      )
      .toArray();

    return this.sortByUpdated(records).map(record => this.withResolvedId(record));
  }

  async listUserTareasByUserCode(userCode: string): Promise<any[]> {
    const records = await metroDB.userTareas
      .where('userCode')
      .equals(userCode)
      .filter(record => !record.deletedAt)
      .toArray();

    return this.sortByUpdated(records).map(record => this.withResolvedId(record));
  }

  async markUserTareaDeleted(id: number, syncStatus: SyncStatus = 'pending'): Promise<void> {
    const record = id > 0
      ? await metroDB.userTareas.where('serverId').equals(id).first()
      : await metroDB.userTareas.filter(item => Number(item.data?.id) === id).first();
    if (record) {
      await metroDB.userTareas.update(record.localId, {
        deletedAt: Date.now(),
        syncStatus,
        updatedAt: Date.now()
      });
    }
  }

  async markUserTareaSynced(localOrServerId: number, remoteData?: any): Promise<void> {
    const record = await this.findUserTareaByAnyId(localOrServerId, remoteData?.id);
    if (!record) {
      if (remoteData) {
        await this.upsertUserTarea(remoteData, 'synced');
      }
      return;
    }

    const serverId = this.toServerId(remoteData?.id) ?? record.serverId;
    const clienteServerId = this.toServerId(remoteData?.clienteId ?? remoteData?.clienteServerId) ?? record.clienteServerId;
    await metroDB.userTareas.put({
      ...record,
      serverId,
      clienteServerId,
      data: { ...record.data, ...remoteData, id: serverId ?? record.data?.id },
      syncStatus: 'synced',
      updatedAt: Date.now(),
      deletedAt: undefined
    });
  }

  async markUserTareaDeleteSynced(id: number): Promise<void> {
    const record = await this.findUserTareaByAnyId(id);
    if (record) {
      await metroDB.userTareas.delete(record.localId);
    }
  }

  async upsertPresupuesto(data: any, syncStatus: SyncStatus = 'synced'): Promise<LocalPresupuesto> {
    const serverId = this.toServerId(data?.id);
    const existing = serverId
      ? await metroDB.presupuestos.where('serverId').equals(serverId).first()
      : await metroDB.presupuestos.filter(record => Number(record.data?.id) === Number(data?.id)).first();

    const clienteId = data?.cliente?.id ?? data?.clienteId ?? data?.clienteServerId;
    const record: LocalPresupuesto = {
      localId: existing?.localId ?? this.resolveLocalId('presupuesto', data?.localId, serverId),
      serverId,
      clienteLocalId: data?.clienteLocalId ?? existing?.clienteLocalId ?? this.localRef('cliente', clienteId),
      clienteServerId: this.toServerId(clienteId) ?? existing?.clienteServerId,
      userCode: data?.userCode ?? data?.cliente?.userCode ?? existing?.userCode,
      data,
      syncStatus,
      updatedAt: Date.now()
    };

    await metroDB.presupuestos.put(record);
    return record;
  }

  async listPresupuestosByClienteId(clienteId: number): Promise<any[]> {
    const records = await metroDB.presupuestos
      .filter(record =>
        !record.deletedAt &&
        (
          Number(record.clienteServerId) === clienteId ||
          Number(record.data?.cliente?.id) === clienteId ||
          Number(record.data?.clienteId) === clienteId ||
          record.clienteLocalId === this.localRef('cliente', clienteId)
        )
      )
      .toArray();

    return this.sortByUpdated(records).map(record => this.withResolvedId(record));
  }

  async markPresupuestoDeleted(id: number, syncStatus: SyncStatus = 'pending'): Promise<void> {
    const record = id > 0
      ? await metroDB.presupuestos.where('serverId').equals(id).first()
      : await metroDB.presupuestos.filter(item => Number(item.data?.id) === id).first();
    if (record) {
      await metroDB.presupuestos.update(record.localId, {
        deletedAt: Date.now(),
        syncStatus,
        updatedAt: Date.now()
      });
    }
  }

  async markPresupuestoSynced(localOrServerId: number, remoteData?: any): Promise<void> {
    const record = await this.findPresupuestoByAnyId(localOrServerId, remoteData?.id);
    if (!record) {
      if (remoteData) {
        await this.upsertPresupuesto(remoteData, 'synced');
      }
      return;
    }

    const serverId = this.toServerId(remoteData?.id) ?? record.serverId;
    const clienteId = remoteData?.cliente?.id ?? remoteData?.clienteId ?? remoteData?.clienteServerId;
    const clienteServerId = this.toServerId(clienteId) ?? record.clienteServerId;
    await metroDB.presupuestos.put({
      ...record,
      serverId,
      clienteServerId,
      data: { ...record.data, ...remoteData, id: serverId ?? record.data?.id },
      syncStatus: 'synced',
      updatedAt: Date.now(),
      deletedAt: undefined
    });
  }

  async markPresupuestoDeleteSynced(id: number): Promise<void> {
    const record = await this.findPresupuestoByAnyId(id);
    if (record) {
      await metroDB.presupuestos.delete(record.localId);
    }
  }

  async saveImageBlob(params: {
    file: File;
    ownerEntity: EntityType;
    ownerLocalId?: string;
    ownerServerId?: number;
    userCode?: string;
    remoteUrl?: string;
    syncStatus?: SyncStatus;
  }): Promise<LocalImageBlob> {
    // Upsert: reutilizar el registro existente para la misma empresa y no acumular duplicados
    const existing = params.ownerServerId
      ? await metroDB.imageBlobs
          .where('ownerEntity').equals(params.ownerEntity)
          .filter(r => Number(r.ownerServerId) === Number(params.ownerServerId) &&
                       r.userCode === params.userCode)
          .first()
      : undefined;

    const record: LocalImageBlob = {
      localId: existing?.localId ?? this.resolveLocalId('image', undefined),
      ownerEntity: params.ownerEntity,
      ownerLocalId: params.ownerLocalId,
      ownerServerId: params.ownerServerId,
      userCode: params.userCode,
      filename: params.file.name || `image-${Date.now()}`,
      mimeType: params.file.type || 'application/octet-stream',
      blob: params.file,
      remoteUrl: params.remoteUrl,
      syncStatus: params.syncStatus ?? 'pending',
      updatedAt: Date.now()
    };

    await metroDB.imageBlobs.put(record);
    return record;
  }

  async setState<T>(key: string, data: T): Promise<void> {
    await metroDB.appState.put({
      key,
      data,
      updatedAt: Date.now()
    });
  }

  async getState<T>(key: string): Promise<T | null> {
    const state = await metroDB.appState.get(key);
    return state?.data ?? null;
  }

  async removeState(key: string): Promise<void> {
    await metroDB.appState.delete(key);
  }

  private withResolvedId<T extends LocalEntity>(record: T): any {
    return {
      ...record.data,
      id: record.serverId ?? record.data?.id,
      localId: record.localId,
      syncStatus: record.syncStatus
    };
  }

  private sortByUpdated<T extends { updatedAt: number }>(records: T[]): T[] {
    return [...records].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  private resolveLocalId(prefix: string, currentLocalId?: string, serverId?: number): string {
    if (currentLocalId) {
      return currentLocalId;
    }

    if (serverId) {
      return `${prefix}:server:${serverId}`;
    }

    return `${prefix}:local:${Date.now()}:${crypto.randomUUID()}`;
  }

  private localRef(prefix: string, value: unknown): string | undefined {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric < 0 ? `${prefix}:local-id:${numeric}` : undefined;
  }

  private toServerId(value: unknown): number | undefined {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
  }

  private async findEmpresaByAnyId(primaryId: number, secondaryId?: number): Promise<LocalEmpresa | undefined> {
    const serverId = this.toServerId(secondaryId) ?? this.toServerId(primaryId);
    const byServerId = serverId ? await metroDB.empresas.where('serverId').equals(serverId).first() : undefined;
    return byServerId ?? await metroDB.empresas.filter(item => Number(item.data?.id) === primaryId).first();
  }

  private async findEmpresaByStoredId(id: number): Promise<LocalEmpresa | undefined> {
    const serverId = this.toServerId(id);
    if (serverId) {
      return await metroDB.empresas.where('serverId').equals(serverId).first();
    }

    return await metroDB.empresas.filter(item => Number(item.data?.id) === id).first();
  }

  private async findClienteByAnyId(primaryId: number, secondaryId?: number): Promise<LocalCliente | undefined> {
    const serverId = this.toServerId(secondaryId) ?? this.toServerId(primaryId);
    const byServerId = serverId ? await metroDB.clientes.where('serverId').equals(serverId).first() : undefined;
    return byServerId ?? await metroDB.clientes.filter(item => Number(item.data?.id) === primaryId).first();
  }

  private async relinkClientesForEmpresaSync(tempEmpresaId: number, serverEmpresaId: number): Promise<void> {
    if (!Number.isFinite(tempEmpresaId) || tempEmpresaId >= 0 || !Number.isFinite(serverEmpresaId) || serverEmpresaId <= 0) {
      return;
    }

    const tempEmpresaLocalRef = this.localRef('empresa', tempEmpresaId);
    const records = await metroDB.clientes
      .filter(record =>
        !record.deletedAt &&
        (
          Number(record.empresaServerId) === tempEmpresaId ||
          Number(record.data?.empresaId) === tempEmpresaId ||
          record.empresaLocalId === tempEmpresaLocalRef
        )
      )
      .toArray();

    for (const record of records) {
      await metroDB.clientes.put({
        ...record,
        empresaLocalId: undefined,
        empresaServerId: serverEmpresaId,
        data: {
          ...record.data,
          empresaId: serverEmpresaId
        },
        updatedAt: Date.now()
      });
    }
  }

  private updateStoredSelectedEmpresa(tempEmpresaId: number, serverEmpresaId: number, remoteData?: any): void {
    const selectedEmpresaRaw = localStorage.getItem('selectedEmpresa');
    if (selectedEmpresaRaw) {
      try {
        const selectedEmpresa = JSON.parse(selectedEmpresaRaw);
        if (Number(selectedEmpresa?.id) === tempEmpresaId) {
          localStorage.setItem('selectedEmpresa', JSON.stringify({
            ...selectedEmpresa,
            ...remoteData,
            id: serverEmpresaId
          }));
          localStorage.setItem('selectedEmpresaId', String(serverEmpresaId));
        }
      } catch {
        // Ignorar JSON invalido y dejar que la UI lo reconstruya.
      }
    }
  }

  private updateStoredSelectedCliente(tempClienteId: number, serverClienteId: number, remoteData?: any): void {
    const selectedClienteRaw = localStorage.getItem('selectedCliente');
    if (selectedClienteRaw) {
      try {
        const selectedCliente = JSON.parse(selectedClienteRaw);
        if (Number(selectedCliente?.id) === tempClienteId) {
          const nextCliente = {
            ...selectedCliente,
            ...remoteData,
            id: serverClienteId
          };
          localStorage.setItem('selectedCliente', JSON.stringify(nextCliente));
          localStorage.setItem('selectedClienteId', String(serverClienteId));

          const empresaId = Number(nextCliente?.empresaId);
          if (Number.isFinite(empresaId)) {
            localStorage.setItem(`selectedClienteId_empresa_${empresaId}`, String(serverClienteId));
          }
        }
      } catch {
        // Ignorar JSON invalido y dejar que la UI lo reconstruya.
      }
    }
  }

  private async findUserTareaByAnyId(primaryId: number, secondaryId?: number): Promise<LocalUserTarea | undefined> {
    const serverId = this.toServerId(secondaryId) ?? this.toServerId(primaryId);
    const byServerId = serverId ? await metroDB.userTareas.where('serverId').equals(serverId).first() : undefined;
    return byServerId ?? await metroDB.userTareas.filter(item => Number(item.data?.id) === primaryId).first();
  }

  private async findPresupuestoByAnyId(primaryId: number, secondaryId?: number): Promise<LocalPresupuesto | undefined> {
    const serverId = this.toServerId(secondaryId) ?? this.toServerId(primaryId);
    const byServerId = serverId ? await metroDB.presupuestos.where('serverId').equals(serverId).first() : undefined;
    return byServerId ?? await metroDB.presupuestos.filter(item => Number(item.data?.id) === primaryId).first();
  }

  private readBlobAsDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer la imagen local.'));
      reader.readAsDataURL(blob);
    });
  }
}
