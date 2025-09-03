import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

export interface Cliente {
  id?: number;
  name: string;
  contact: string;
  budgetDate: string;
  additionalDetails: string;
  userCode: string;
  email: string;
  clave: string;
  direccion: string;
  empresaId: number;
}

@Injectable({
  providedIn: 'root'
})
export class ClienteService {

  //private apiUrl = 'http://localhost:8080/api/clientes';
  private apiUrl = 'https://metrobackapp-production.up.railway.app/api/clientes'

  constructor(private http: HttpClient) { }

getClienteByUserCode(userCode: string): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.apiUrl}/${userCode}`)
      .pipe(catchError(this.handleError));
  }

  getClienteById(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.apiUrl}/id/${id}`)
      .pipe(catchError(this.handleError));
  }

   getClientesByEmpresaId(empresaId: number): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.apiUrl}/by-empresa/${empresaId}`)
      .pipe(catchError(this.handleError));
  }


  saveCliente(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(this.apiUrl, cliente)
      .pipe(catchError(this.handleError));
  }

  updateCliente(id: number, cliente: Cliente): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.apiUrl}/id/${id}`, cliente)
      .pipe(catchError(this.handleError));
  }

  deleteCliente(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/id/${id}`)
      .pipe(catchError(this.handleError));
  }

  private handleError0(error: any): Observable<never> {
    let errorMessage = 'Error desconocido';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.error && error.error.error) {
      errorMessage = error.error.error; // Use backend error message
    } else {
      errorMessage = `Error ${error.status}: ${error.message}`;
    }
    console.error('Error en ClienteService:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }


  private handleError(error: any): Observable<never> {
    let errorMessage = 'Error desconocido';
    if (error.error instanceof ErrorEvent) {
        // Error del lado del cliente (e.g., problema de red)
        errorMessage = `Error: ${error.error.message}`;
    } else if (error.status === 400 && error.error && error.error.error) {
        // Error 400 con mensaje personalizado del backend
        errorMessage = error.error.error;
    } else {
        // Otros errores HTTP
        errorMessage = `Error ${error.status || 'desconocido'}: ${error.message || 'Error interno del servidor'}`;
        // Incluir mensaje del backend si está disponible
        if (error.error && typeof error.error === 'string') {
            errorMessage = error.error;
        } else if (error.error && error.error.message) {
            errorMessage = error.error.message;
        }
    }
    console.error('Error en ClienteService:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
}





}
