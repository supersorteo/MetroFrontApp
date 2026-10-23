import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_API_URL } from '../core/api/api.config';
import { PrecioMaterial } from './precio-material.service';

export interface PrecioMaterialPage {
  content: PrecioMaterial[];
  totalElements: number;
  totalPages: number;
  number: number;
}

@Injectable({ providedIn: 'root' })
export class AdminPrecioMaterialService {
  private readonly base = `${APP_API_URL}/precios-materiales/admin`;

  constructor(private http: HttpClient) {}

  getPage(pais: string, page: number, size: number, buscar: string, categorias: string[] = []): Observable<PrecioMaterialPage> {
    let params = `pais=${encodeURIComponent(pais)}&page=${page}&size=${size}&buscar=${encodeURIComponent(buscar)}`;
    categorias.forEach(c => { params += `&categorias=${encodeURIComponent(c)}`; });
    return this.http.get<PrecioMaterialPage>(`${this.base}?${params}`);
  }

  getCategorias(pais: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/categorias?pais=${encodeURIComponent(pais)}`);
  }

  create(pm: Partial<PrecioMaterial>): Observable<PrecioMaterial> {
    return this.http.post<PrecioMaterial>(this.base, pm);
  }

  update(id: number, pm: Partial<PrecioMaterial>): Observable<PrecioMaterial> {
    return this.http.put<PrecioMaterial>(`${this.base}/${id}`, pm);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
