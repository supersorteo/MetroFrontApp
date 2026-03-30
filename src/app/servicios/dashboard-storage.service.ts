import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DashboardStorageService {
  private readonly keys = {
    userCode: 'userCode',
    userData: 'userData',
    selectedEmpresaId: 'selectedEmpresaId',
    selectedEmpresa: 'selectedEmpresa',
    selectedClienteId: 'selectedClienteId',
    selectedCliente: 'selectedCliente',
    selectedPresupuestoName: 'selectedPresupuestoName',
    presupuestoCargado: 'presupuestoCargado',
    reloadClientes: 'reloadClientes'
  };

  getUserCode(): string {
    return localStorage.getItem(this.keys.userCode) || '';
  }

  getUserData<T>(): T | null {
    return this.readJson<T>(this.keys.userData);
  }

  setUserData<T>(value: T): void {
    this.writeJson(this.keys.userData, value);
  }

  hasReloadClientes(): boolean {
    return localStorage.getItem(this.keys.reloadClientes) !== null;
  }

  consumeReloadClientes(): void {
    localStorage.removeItem(this.keys.reloadClientes);
  }

  getSelectedEmpresaId(): string | null {
    return localStorage.getItem(this.keys.selectedEmpresaId);
  }

  setSelectedEmpresaId(value: number | string): void {
    localStorage.setItem(this.keys.selectedEmpresaId, String(value));
  }

  clearSelectedEmpresaId(): void {
    localStorage.removeItem(this.keys.selectedEmpresaId);
  }

  getSelectedClienteId(): string | null {
    return localStorage.getItem(this.keys.selectedClienteId);
  }

  setSelectedClienteId(value: number | string): void {
    localStorage.setItem(this.keys.selectedClienteId, String(value));
  }

  clearSelectedClienteId(): void {
    localStorage.removeItem(this.keys.selectedClienteId);
  }

  getSelectedCliente<T>(): T | null {
    return this.readJson<T>(this.keys.selectedCliente);
  }

  setSelectedCliente<T>(value: T): void {
    this.writeJson(this.keys.selectedCliente, value);
  }

  clearSelectedCliente(): void {
    localStorage.removeItem(this.keys.selectedCliente);
  }

  setSelectedEmpresa<T>(value: T): void {
    this.writeJson(this.keys.selectedEmpresa, value);
  }

  clearSelectedEmpresa(): void {
    localStorage.removeItem(this.keys.selectedEmpresa);
  }

  clearSelectedPresupuestoName(): void {
    localStorage.removeItem(this.keys.selectedPresupuestoName);
  }

  getPresupuestoCargado<T>(): T | null {
    return this.readJson<T>(this.keys.presupuestoCargado);
  }

  setPresupuestoCargado<T>(value: T): void {
    this.writeJson(this.keys.presupuestoCargado, value);
  }

  clearPresupuestoCargado(): void {
    localStorage.removeItem(this.keys.presupuestoCargado);
  }

  private readJson<T>(key: string): T | null {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) as T : null;
    } catch {
      return null;
    }
  }

  private writeJson<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
