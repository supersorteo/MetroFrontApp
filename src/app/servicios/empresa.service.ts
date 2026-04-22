import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { APP_API_URL } from '../core/api/api.config';
import { extractApiErrorMessage } from '../core/http/api-error.util';

export interface Empresa {
  id?: number;
  name: string;
  phone: string;
  email: string;
  description: string;
  logoUrl: string;
  userCode: string;
  website?: string;
  tiktok?: string;
  instagram?: string;
  facebook?: string;
  cuilCuit?: string;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  tableColor?: string;
  tableTextColor?: string;
  secondaryColor2?: string;
  gradientAngle?: string;
  infoBoxColorHex?: string;
  infoBoxOpacity?: number;
  tableBodyColor?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmpresaService {


 // private apiUrl = 'http://localhost:8080/api/empresas';
  //private apiUrl = 'https://adequate-education-production.up.railway.app/api/empresas'
  //private uploadUrl = 'http://localhost:8080/api/upload/image';
  //private uploadUrl = 'https://adequate-education-production.up.railway.app/api/upload/image';

  private apiUrl = `${APP_API_URL}/empresas`;
  private uploadUrl = `${APP_API_URL}/upload/image`;

  constructor(private http: HttpClient) { }

  getEmpresaById(id: number): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.apiUrl}/id/${id}`)
      .pipe(catchError(this.handleError));
  }

getEmpresaByUserCode(userCode: string): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.apiUrl}/${userCode}`)
      .pipe(catchError(this.handleError));
  }



  saveEmpresa(empresa: Empresa): Observable<Empresa> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<Empresa>(this.apiUrl, empresa, { headers })
      .pipe(catchError(this.handleError));
  }

  updateEmpresa(id: number, empresa: Empresa): Observable<Empresa> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<Empresa>(`${this.apiUrl}/id/${id}`, empresa, { headers })
      .pipe(catchError(this.handleError));
  }

  deleteEmpresa(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/id/${id}`)
      .pipe(catchError(this.handleError));
  }



   uploadImage(file: File, userCode: string): Observable<string> {
    const formData = new FormData();
    formData.append('files', file); // Cambiado a 'files' para coincidir con el backend
    formData.append('userCode', userCode);
    return this.http.post<{ urls: string[] }>(this.uploadUrl, formData)
      .pipe(
        catchError(this.handleError),
        map(response => response.urls[0]) // Tomar la primera URL
      );
    }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'Error desconocido';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = extractApiErrorMessage(error);
    }
    return throwError(() => new Error(errorMessage));
  }

}

