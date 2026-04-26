import Dexie, { Table } from 'dexie';

export type EntityType = 'empresa' | 'cliente' | 'calculo-material' | 'user-tarea' | 'presupuesto' | 'empresa-logo';
export type OperationType = 'create' | 'update' | 'delete' | 'upload';
export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'failed' | 'conflict';

export interface PendingOp {
  id?: number;
  idempotencyKey: string;
  sequence: number;
  entity: EntityType;
  operation: OperationType;
  payload: any;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  clientTimestamp: number;
  retries: number;
  errorMessage?: string;
}

export interface CachedEmpresa {
  userCode: string;
  data: any;
  cachedAt: number;
}

export interface CachedClientes {
  empresaId: number;
  data: any[];
  cachedAt: number;
}

export interface CachedCalculos {
  userCode: string;
  historial: any[];
  ultimasTareas: any[];
  cachedAt: number;
}

export interface CachedUserTareas {
  cacheKey: string;
  data: any[];
  cachedAt: number;
}

export interface LocalEmpresa {
  localId: string;
  serverId?: number;
  userCode: string;
  data: any;
  syncStatus: SyncStatus;
  updatedAt: number;
  deletedAt?: number;
}

export interface LocalCliente {
  localId: string;
  serverId?: number;
  empresaLocalId?: string;
  empresaServerId?: number;
  userCode: string;
  data: any;
  syncStatus: SyncStatus;
  updatedAt: number;
  deletedAt?: number;
}

export interface LocalUserTarea {
  localId: string;
  serverId?: number;
  clienteLocalId?: string;
  clienteServerId?: number;
  userCode?: string;
  data: any;
  syncStatus: SyncStatus;
  updatedAt: number;
  deletedAt?: number;
}

export interface LocalPresupuesto {
  localId: string;
  serverId?: number;
  clienteLocalId?: string;
  clienteServerId?: number;
  empresaLocalId?: string;
  empresaServerId?: number;
  userCode?: string;
  data: any;
  syncStatus: SyncStatus;
  updatedAt: number;
  deletedAt?: number;
}

export interface LocalImageBlob {
  localId: string;
  ownerEntity: EntityType;
  ownerLocalId?: string;
  ownerServerId?: number;
  userCode?: string;
  filename: string;
  mimeType: string;
  blob: Blob;
  localUrl?: string;
  remoteUrl?: string;
  syncStatus: SyncStatus;
  updatedAt: number;
}

export interface LocalAppState {
  key: string;
  data: any;
  updatedAt: number;
}

class MetroDB extends Dexie {
  pendingOps!: Table<PendingOp, number>;
  cachedEmpresas!: Table<CachedEmpresa, string>;
  cachedClientes!: Table<CachedClientes, number>;
  cachedCalculos!: Table<CachedCalculos, string>;
  cachedUserTareas!: Table<CachedUserTareas, string>;
  empresas!: Table<LocalEmpresa, string>;
  clientes!: Table<LocalCliente, string>;
  userTareas!: Table<LocalUserTarea, string>;
  presupuestos!: Table<LocalPresupuesto, string>;
  imageBlobs!: Table<LocalImageBlob, string>;
  appState!: Table<LocalAppState, string>;

  constructor() {
    super('MetroDB');
    this.version(1).stores({
      pendingOps: '++id, idempotencyKey, sequence, entity',
      cachedEmpresas: 'userCode',
      cachedClientes: 'empresaId',
      cachedCalculos: 'userCode'
    });
    this.version(2).stores({
      pendingOps: '++id, idempotencyKey, sequence, entity',
      cachedEmpresas: 'userCode',
      cachedClientes: 'empresaId',
      cachedCalculos: 'userCode',
      cachedUserTareas: 'cacheKey'
    });
    this.version(3).stores({
      pendingOps: '++id, idempotencyKey, sequence, entity',
      cachedEmpresas: 'userCode',
      cachedClientes: 'empresaId',
      cachedCalculos: 'userCode',
      cachedUserTareas: 'cacheKey',
      empresas: 'localId, serverId, userCode, syncStatus, updatedAt',
      clientes: 'localId, serverId, empresaServerId, empresaLocalId, userCode, syncStatus, updatedAt',
      userTareas: 'localId, serverId, clienteServerId, clienteLocalId, userCode, syncStatus, updatedAt',
      presupuestos: 'localId, serverId, clienteServerId, clienteLocalId, userCode, syncStatus, updatedAt',
      imageBlobs: 'localId, ownerEntity, ownerLocalId, ownerServerId, userCode, syncStatus, updatedAt'
    });
    this.version(4).stores({
      pendingOps: '++id, idempotencyKey, sequence, entity',
      cachedEmpresas: 'userCode',
      cachedClientes: 'empresaId',
      cachedCalculos: 'userCode',
      cachedUserTareas: 'cacheKey',
      empresas: 'localId, serverId, userCode, syncStatus, updatedAt',
      clientes: 'localId, serverId, empresaServerId, empresaLocalId, userCode, syncStatus, updatedAt',
      userTareas: 'localId, serverId, clienteServerId, clienteLocalId, userCode, syncStatus, updatedAt',
      presupuestos: 'localId, serverId, clienteServerId, clienteLocalId, userCode, syncStatus, updatedAt',
      imageBlobs: 'localId, ownerEntity, ownerLocalId, ownerServerId, userCode, syncStatus, updatedAt',
      appState: 'key, updatedAt'
    });
    this.version(5).stores({
      pendingOps: '++id, idempotencyKey, sequence, entity',
      cachedEmpresas: 'userCode',
      cachedClientes: 'empresaId',
      cachedCalculos: 'userCode',
      cachedUserTareas: 'cacheKey',
      empresas: 'localId, serverId, userCode, syncStatus, updatedAt',
      clientes: 'localId, serverId, empresaServerId, empresaLocalId, userCode, syncStatus, updatedAt',
      userTareas: 'localId, serverId, clienteServerId, clienteLocalId, userCode, syncStatus, updatedAt',
      presupuestos: 'localId, serverId, clienteServerId, clienteLocalId, empresaServerId, empresaLocalId, userCode, syncStatus, updatedAt',
      imageBlobs: 'localId, ownerEntity, ownerLocalId, ownerServerId, userCode, syncStatus, updatedAt',
      appState: 'key, updatedAt'
    });
  }
}

export const metroDB = new MetroDB();
