import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { APP_API_URL } from '../core/api/api.config';
import { extractApiErrorMessage } from '../core/http/api-error.util';

export interface TareaPersonalizada {
  id?: number;
  userCode: string;
  tarea: string;
  descripcion: string;
  costo: number;
}

@Injectable({ providedIn: 'root' })
export class TareaPersonalizadaService {
  private apiUrl = `${APP_API_URL}/tareas-personalizadas`;
  private readonly PENDING_KEY = 'tareas_personalizadas_pending';

  constructor(private http: HttpClient) {}

  getByUserCode(userCode: string): Observable<TareaPersonalizada[]> {
    return this.http.get<TareaPersonalizada[]>(`${this.apiUrl}/by-user/${userCode}`).pipe(
      tap(list => this.saveToCache(userCode, list)),
      catchError(() => of(this.loadFromCache(userCode)))
    );
  }

  create(tarea: TareaPersonalizada): Observable<TareaPersonalizada> {
    if (!navigator.onLine) {
      const local = this.savePending('create', tarea);
      return of(local);
    }
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<TareaPersonalizada>(this.apiUrl, tarea, { headers }).pipe(
      tap(saved => this.updateCache(tarea.userCode, saved, 'add')),
      catchError(error => {
        if (this.isOfflineLike(error)) {
          return of(this.savePending('create', tarea));
        }
        return throwError(() => new Error(extractApiErrorMessage(error)));
      })
    );
  }

  update(id: number, tarea: TareaPersonalizada): Observable<TareaPersonalizada> {
    if (!navigator.onLine) {
      this.savePending('update', { ...tarea, id });
      this.updateCache(tarea.userCode, { ...tarea, id }, 'update');
      return of({ ...tarea, id });
    }
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<TareaPersonalizada>(`${this.apiUrl}/${id}`, tarea, { headers }).pipe(
      tap(saved => this.updateCache(tarea.userCode, saved, 'update')),
      catchError(error => {
        if (this.isOfflineLike(error)) {
          this.savePending('update', { ...tarea, id });
          this.updateCache(tarea.userCode, { ...tarea, id }, 'update');
          return of({ ...tarea, id });
        }
        return throwError(() => new Error(extractApiErrorMessage(error)));
      })
    );
  }

  delete(id: number, userCode: string): Observable<void> {
    if (!navigator.onLine) {
      this.savePending('delete', { id, userCode, tarea: '', descripcion: '', costo: 0 });
      this.updateCache(userCode, { id } as TareaPersonalizada, 'remove');
      return of(void 0);
    }
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.updateCache(userCode, { id } as TareaPersonalizada, 'remove')),
      catchError(error => {
        if (this.isOfflineLike(error)) {
          this.savePending('delete', { id, userCode, tarea: '', descripcion: '', costo: 0 });
          this.updateCache(userCode, { id } as TareaPersonalizada, 'remove');
          return of(void 0);
        }
        return throwError(() => new Error(extractApiErrorMessage(error)));
      })
    );
  }

  syncPending(userCode: string): Observable<void> {
    const pending = this.getPending();
    if (!pending.length || !navigator.onLine) return of(void 0);

    const userPending = pending.filter(p => p.tarea.userCode === userCode);
    if (!userPending.length) return of(void 0);

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const calls = userPending.map(p => {
      if (p.op === 'create') {
        return this.http.post<TareaPersonalizada>(this.apiUrl, p.tarea, { headers }).pipe(
          tap(saved => {
            this.updateCache(userCode, saved, 'update');
            this.removePending(p);
          }),
          catchError(() => of(null))
        );
      }
      if (p.op === 'update' && p.tarea.id) {
        return this.http.put<TareaPersonalizada>(`${this.apiUrl}/${p.tarea.id}`, p.tarea, { headers }).pipe(
          tap(() => this.removePending(p)),
          catchError(() => of(null))
        );
      }
      if (p.op === 'delete' && p.tarea.id) {
        return this.http.delete<void>(`${this.apiUrl}/${p.tarea.id}`).pipe(
          tap(() => this.removePending(p)),
          catchError(() => of(null))
        );
      }
      return of(null);
    });

    return from(Promise.all(calls.map(obs => obs.toPromise()))).pipe(map(() => void 0));
  }

  private cacheKey(userCode: string): string {
    return `tareas_personalizadas_${userCode}`;
  }

  private saveToCache(userCode: string, list: TareaPersonalizada[]): void {
    try { localStorage.setItem(this.cacheKey(userCode), JSON.stringify(list)); } catch {}
  }

  private loadFromCache(userCode: string): TareaPersonalizada[] {
    try {
      const raw = localStorage.getItem(this.cacheKey(userCode));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private updateCache(userCode: string, item: TareaPersonalizada, op: 'add' | 'update' | 'remove'): void {
    const list = this.loadFromCache(userCode);
    if (op === 'add') {
      list.push(item);
    } else if (op === 'update') {
      const idx = list.findIndex(t => t.id === item.id);
      if (idx !== -1) list[idx] = item; else list.push(item);
    } else {
      const idx = list.findIndex(t => t.id === item.id);
      if (idx !== -1) list.splice(idx, 1);
    }
    this.saveToCache(userCode, list);
  }

  private savePending(op: 'create' | 'update' | 'delete', tarea: TareaPersonalizada): TareaPersonalizada {
    const local: TareaPersonalizada = { ...tarea, id: tarea.id ?? -Date.now() };
    const pending = this.getPending();
    pending.push({ op, tarea: local });
    try { localStorage.setItem(this.PENDING_KEY, JSON.stringify(pending)); } catch {}
    this.updateCache(tarea.userCode, local, op === 'delete' ? 'remove' : op === 'update' ? 'update' : 'add');
    return local;
  }

  private getPending(): { op: 'create' | 'update' | 'delete'; tarea: TareaPersonalizada }[] {
    try {
      const raw = localStorage.getItem(this.PENDING_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private removePending(item: { op: string; tarea: TareaPersonalizada }): void {
    const list = this.getPending().filter(p => !(p.op === item.op && p.tarea.id === item.tarea.id));
    try { localStorage.setItem(this.PENDING_KEY, JSON.stringify(list)); } catch {}
  }

  private isOfflineLike(error: any): boolean {
    return [0, 502, 503, 504].includes(Number(error?.status)) || !navigator.onLine;
  }
}
