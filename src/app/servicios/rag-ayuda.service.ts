import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_API_URL } from '../core/api/api.config';

export interface RagAyudaResponse {
  respuesta: string;
  error: boolean;
}

@Injectable({ providedIn: 'root' })
export class RagAyudaService {
  private readonly apiUrl = `${APP_API_URL}/rag/ayuda/consulta`;

  constructor(private http: HttpClient) {}

  consultar(pregunta: string, userCode?: string): Observable<RagAyudaResponse> {
    return this.http.post<RagAyudaResponse>(this.apiUrl, { pregunta, userCode });
  }
}
