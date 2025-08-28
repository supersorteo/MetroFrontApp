import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';


//interface Tarea { id?: number; nombre: string; costo: number; area: number; descripcion: string; descuento: number}


export interface Tarea {
  id?: number;
  tarea: string;
  costo: number;
  rubro: string;
  categoria: string;
  pais: string;
  descripcion: string;
  descuento: number;
  area: number;
  totalCost?: number;
  userCode?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TareaService {
//private apiUrl = 'http://localhost:8080/api/tareas'
private apiUrl = 'https://metrobackapp-production.up.railway.app/api/tareas';

  constructor(private http: HttpClient) { }

  getTareas(): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(this.apiUrl)
    .pipe(
      catchError(this.handleError)
    );
  }

   getTareasByPais(pais: string): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(`${this.apiUrl}/by-pais?pais=${pais}`)
      .pipe(catchError(this.handleError));
  }

  agregarTarea(tarea: Tarea): Observable<Tarea> {
    return this.http.post<Tarea>(this.apiUrl, tarea)
    .pipe(
      catchError(this.handleError)
    );
  }

  actualizarTarea(id: number, tarea: Tarea): Observable<Tarea> {
    return this.http.put<Tarea>(`${this.apiUrl}/${id}`, tarea) .pipe( catchError(this.handleError) );
  }

  eliminarTarea(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`) .pipe( catchError(this.handleError) );
  }

  private handleError(error: any): Observable<never> {
    console.error('Ocurrió un error:', error);
    return throwError('Algo salió mal; por favor, intente nuevamente más tarde.');
  }
}
