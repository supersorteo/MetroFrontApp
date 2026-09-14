import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_API_URL } from '../core/api/api.config';

export interface RagUnificadoResponse {
  respuesta: string;
  error: boolean;
}

@Injectable({ providedIn: 'root' })
export class RagUnificadoService {
  private readonly apiUrl = `${APP_API_URL}/rag/consulta`;

  constructor(private http: HttpClient) {}

  consultar(pregunta: string, userCode?: string): Observable<RagUnificadoResponse> {
    return this.http.post<RagUnificadoResponse>(this.apiUrl, { pregunta, userCode });
  }
}
