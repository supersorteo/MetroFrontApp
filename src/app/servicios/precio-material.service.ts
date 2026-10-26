import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
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
  private readonly apiUrl = `${APP_API_URL}/precios-materiales`;
  private cache = new Map<string, PrecioMaterial[]>();

  constructor(private http: HttpClient) {}

  getByPais(pais: string): Observable<PrecioMaterial[]> {
    if (this.cache.has(pais)) return of(this.cache.get(pais)!);
    return this.http.get<PrecioMaterial[]>(`${this.apiUrl}?pais=${encodeURIComponent(pais)}`)
      .pipe(tap(data => this.cache.set(pais, data)));
  }
}
