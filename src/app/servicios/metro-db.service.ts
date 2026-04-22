import Dexie, { Table } from 'dexie';

export type EntityType = 'empresa' | 'cliente' | 'calculo-material' | 'user-tarea' | 'presupuesto';
export type OperationType = 'create' | 'update' | 'delete';

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

class MetroDB extends Dexie {
  pendingOps!: Table<PendingOp, number>;
  cachedEmpresas!: Table<CachedEmpresa, string>;
  cachedClientes!: Table<CachedClientes, number>;
  cachedCalculos!: Table<CachedCalculos, string>;

  constructor() {
    super('MetroDB');
    this.version(1).stores({
      pendingOps: '++id, idempotencyKey, sequence, entity',
      cachedEmpresas: 'userCode',
      cachedClientes: 'empresaId',
      cachedCalculos: 'userCode'
    });
  }
}

export const metroDB = new MetroDB();
