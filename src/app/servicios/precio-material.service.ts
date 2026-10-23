import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_API_URL } from '../core/api/api.config';

export interface PrecioMaterial {
  id: number;
  nombre: string;
  categoriaId: string;
  categoriaNombre: string;
  unidad: string;
  nombreUnidad: string;
  precio: number;
  moneda: string;
  pais: string;
  sourceId?: number;
}

@Injectable({ providedIn: 'root' })
export class PrecioMaterialService {
  private readonly base = `${APP_API_URL}/precios-materiales`;

  constructor(private http: HttpClient) {}

  getByPais(pais: string): Observable<PrecioMaterial[]> {
    return this.http.get<PrecioMaterial[]>(`${this.base}?pais=${encodeURIComponent(pais)}`);
  }
}
