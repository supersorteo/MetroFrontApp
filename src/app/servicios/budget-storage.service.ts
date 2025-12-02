import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserTarea } from './user-tarea.service';
import { Cliente } from './cliente.service';
import { Empresa } from './empresa.service';

export interface SavedPresupuesto {
  id: string;
  name: string;
  createdAt: string;
  empresa: Empresa | null;
  cliente: Cliente | null;
  tareas: UserTarea[];
}

@Injectable({
  providedIn: 'root'
})
export class BudgetStorageService {
  private readonly STORAGE_KEY = 'savedPresupuestos';
  private readonly MAX_ITEMS = 100;
  private budgetsSubject = new BehaviorSubject<SavedPresupuesto[]>(this.loadFromStorage());

  budgets$ = this.budgetsSubject.asObservable();

  get maxItems(): number {
    return this.MAX_ITEMS;
  }

  get currentBudgets(): SavedPresupuesto[] {
    return this.budgetsSubject.value;
  }

  addBudget(payload: Omit<SavedPresupuesto, 'id' | 'createdAt'>) {
    if (!payload.tareas.length) {
      return { ok: false, error: 'No hay tareas para guardar en el presupuesto.' };
    }
    if (this.currentBudgets.length >= this.MAX_ITEMS) {
      return { ok: false, error: 'Has alcanzado el límite máximo de presupuestos guardados.' };
    }
    const nuevoPresupuesto: SavedPresupuesto = {
      ...payload,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };
    this.persist([nuevoPresupuesto, ...this.currentBudgets]);
    return { ok: true, budget: nuevoPresupuesto };
  }

  removeBudget(id: string) {
    const filtered = this.currentBudgets.filter(b => b.id !== id);
    this.persist(filtered);
  }

  getBudget(id: string): SavedPresupuesto | undefined {
    return this.currentBudgets.find(b => b.id === id);
  }

  private persist(budgets: SavedPresupuesto[]) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(budgets));
    this.budgetsSubject.next(budgets);
  }

  private loadFromStorage(): SavedPresupuesto[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private generateId(): string {
    return `presupuesto-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
