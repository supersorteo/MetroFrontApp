import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_API_URL } from '../core/api/api.config';

export interface RagConsultaResponse {
  respuesta: string;
  error: boolean;
}

@Injectable({ providedIn: 'root' })
export class RagCalculadoraService {
  private readonly apiUrl = `${APP_API_URL}/rag/calculadora/consulta`;

  constructor(private http: HttpClient) {}

  consultar(pregunta: string, userCode?: string): Observable<RagConsultaResponse> {
    return this.http.post<RagConsultaResponse>(this.apiUrl, { pregunta, userCode });
  }
}
