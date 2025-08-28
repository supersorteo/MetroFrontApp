import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

export interface UserTarea {
  id?: number;
  tarea: string;
  costo: number;
  area: number;
  descripcion: string;
  descuento: number;
  totalCost: number;
  userCode: string;
  pais: string;
  rubro?: string; // Añadido como opcional
  categoria?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserTareaService {

  //private apiUrl = 'http://localhost:8080/api/user-tareas';
  private apiUrl = 'https://metrobackapp-production.up.railway.app/api/user-tareas';

  constructor(private http: HttpClient) { }

getTareasByUserCode(userCode: string): Observable<UserTarea[]> {
    return this.http.get<UserTarea[]>(`${this.apiUrl}/by-user/${userCode}`)
      .pipe(catchError(this.handleError));
  }

  addUserTarea(userTarea: UserTarea): Observable<UserTarea> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<UserTarea>(this.apiUrl, userTarea, { headers })
      .pipe(catchError(this.handleError));
  }

  updateUserTarea(id: number, userTarea: UserTarea): Observable<UserTarea> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<UserTarea>(`${this.apiUrl}/${id}`, userTarea, { headers })
      .pipe(catchError(this.handleError));
  }

  deleteUserTarea(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'Error desconocido';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = error.error?.message || `Error ${error.status}: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }

}
