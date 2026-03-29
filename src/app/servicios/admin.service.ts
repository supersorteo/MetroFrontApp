import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_BASE_URL } from '../core/api/api.config';

export interface Admin {
  id: string;
  pais: 'argentina' | 'uruguay' | 'colombia';
  nombre: string;
  username: string;
  password: string;
  flag: string;
}

const SESSION_KEY  = 'metro_admin_session';
const CODE_MAP_KEY = 'metro_code_country_map';
const API_URL      = `${API_BASE_URL}/admin-panel`;

@Injectable({ providedIn: 'root' })
export class AdminService {

  constructor(private http: HttpClient) {}

  // ── Sesión local ───────────────────────────────────────────

  getCurrentAdmin(): Admin | null {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }

  isLoggedIn(): boolean {
    return this.getCurrentAdmin() !== null;
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  }

  // ── Backend calls ──────────────────────────────────────────

  /** Verificar credenciales contra la base de datos */
  login(username: string, password: string): Observable<Admin | null> {
    return this.http.post<Admin>(`${API_URL}/login`, { username, password }).pipe(
      tap(admin => {
        if (admin) localStorage.setItem(SESSION_KEY, JSON.stringify(admin));
      }),
      catchError(() => of(null))
    );
  }

  /** Obtener todos los admins */
  getAll(): Observable<Admin[]> {
    return this.http.get<Admin[]>(API_URL).pipe(
      catchError(() => of([]))
    );
  }

  /** Obtener admin por id */
  getById(id: string): Observable<Admin | null> {
    return this.http.get<Admin>(`${API_URL}/${id}`).pipe(
      catchError(() => of(null))
    );
  }

  /** Obtener admin por país */
  getByPais(pais: string): Observable<Admin | null> {
    return this.http.get<Admin>(`${API_URL}/pais/${pais}`).pipe(
      catchError(() => of(null))
    );
  }

  /** Actualizar nombre, username y/o password del admin */
  updateAdmin(id: string, changes: Partial<Pick<Admin, 'nombre' | 'username' | 'password'>>): Observable<Admin | null> {
    return this.http.put<Admin>(`${API_URL}/${id}`, changes).pipe(
      tap(updated => {
        if (updated) {
          // Actualizar sesión local si es el admin activo
          const current = this.getCurrentAdmin();
          if (current?.id === id) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
          }
        }
      }),
      catchError(() => of(null))
    );
  }

  // ── Tagging de códigos por país (localStorage) ─────────────

  tagCodes(codes: string[], pais: string): void {
    const map = this.getCodeCountryMap();
    codes.forEach(c => map[c] = pais);
    localStorage.setItem(CODE_MAP_KEY, JSON.stringify(map));
  }

  getCodeCountryMap(): { [code: string]: string } {
    try {
      const s = localStorage.getItem(CODE_MAP_KEY);
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  }

  removeCodeFromMap(code: string): void {
    const map = this.getCodeCountryMap();
    delete map[code];
    localStorage.setItem(CODE_MAP_KEY, JSON.stringify(map));
  }

  // ── Mapeo provincia → país ─────────────────────────────────

  getCountryOfProvince(provincia: string): string | null {
    if (!provincia) return null;
    const p = provincia.toLowerCase();

    const AR = ['buenos aires','córdoba','santa fe','mendoza','tucumán','entre ríos','salta',
      'misiones','chaco','corrientes','santiago del estero','san juan','jujuy','río negro',
      'neuquén','formosa','chubut','san luis','catamarca','la rioja','la pampa','santa cruz',
      'tierra del fuego'];
    const UY = ['artigas','canelones','cerro largo','colonia','durazno','flores','florida',
      'lavalleja','maldonado','montevideo','paysandú','río negro','rivera','rocha','salto',
      'san josé','soriano','tacuarembó','treinta y tres'];
    const CO = ['bogotá','antioquia','valle del cauca','cundinamarca','atlántico','bolívar',
      'santander','nariño','córdoba','tolima','cauca','norte de santander','huila','meta',
      'magdalena','boyacá','cesar','risaralda','caldas','sucre','quindío','chocó','arauca',
      'casanare','putumayo','la guajira','amazonas','guainía','guaviare','vaupés','vichada',
      'san andrés','caquetá'];

    if (AR.some(x => p.includes(x))) return 'argentina';
    if (UY.some(x => p.includes(x))) return 'uruguay';
    if (CO.some(x => p.includes(x))) return 'colombia';
    return null;
  }
}
