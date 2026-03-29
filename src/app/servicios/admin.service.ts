import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_BASE_URL } from '../core/api/api.config';
import { countryAdminKey } from '../core/country/country.util';

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

  private normalizeAdmin(admin: Admin): Admin {
    return {
      ...admin,
      pais: countryAdminKey(admin.pais) ?? admin.pais
    };
  }

  // â”€â”€ SesiÃ³n local â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  getCurrentAdmin(): Admin | null {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      return s ? this.normalizeAdmin(JSON.parse(s)) : null;
    } catch { return null; }
  }

  isLoggedIn(): boolean {
    return this.getCurrentAdmin() !== null;
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  }

  // â”€â”€ Backend calls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Verificar credenciales contra la base de datos */
  login(username: string, password: string): Observable<Admin | null> {
    return this.http.post<Admin>(`${API_URL}/login`, { username, password }).pipe(
      tap(admin => {
        if (admin) localStorage.setItem(SESSION_KEY, JSON.stringify(this.normalizeAdmin(admin)));
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
      map(admin => admin ? this.normalizeAdmin(admin) : null),
      catchError(() => of(null))
    );
  }

  /** Obtener admin por paÃ­s */
  getByPais(pais: string): Observable<Admin | null> {
    return this.http.get<Admin>(`${API_URL}/pais/${pais}`).pipe(
      map(admin => admin ? this.normalizeAdmin(admin) : null),
      catchError(() => of(null))
    );
  }

  /** Actualizar nombre, username y/o password del admin */
  updateAdmin(id: string, changes: Partial<Pick<Admin, 'nombre' | 'username' | 'password'>>): Observable<Admin | null> {
    return this.http.put<Admin>(`${API_URL}/${id}`, changes).pipe(
      tap(updated => {
        if (updated) {
          // Actualizar sesiÃ³n local si es el admin activo
          const current = this.getCurrentAdmin();
          if (current?.id === id) {
            const normalizedUpdated = this.normalizeAdmin(updated);
            localStorage.setItem(SESSION_KEY, JSON.stringify(normalizedUpdated));
          }
        }
      }),
      catchError(() => of(null))
    );
  }

  // â”€â”€ Tagging de cÃ³digos por paÃ­s (localStorage) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Mapeo provincia â†’ paÃ­s â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  getCountryOfProvince(provincia: string): string | null {
    if (!provincia) return null;
    const p = provincia.toLowerCase();

    const AR = ['buenos aires','cÃ³rdoba','santa fe','mendoza','tucumÃ¡n','entre rÃ­os','salta',
      'misiones','chaco','corrientes','santiago del estero','san juan','jujuy','rÃ­o negro',
      'neuquÃ©n','formosa','chubut','san luis','catamarca','la rioja','la pampa','santa cruz',
      'tierra del fuego'];
    const UY = ['artigas','canelones','cerro largo','colonia','durazno','flores','florida',
      'lavalleja','maldonado','montevideo','paysandÃº','rÃ­o negro','rivera','rocha','salto',
      'san josÃ©','soriano','tacuarembÃ³','treinta y tres'];
    const CO = ['bogotÃ¡','antioquia','valle del cauca','cundinamarca','atlÃ¡ntico','bolÃ­var',
      'santander','nariÃ±o','cÃ³rdoba','tolima','cauca','norte de santander','huila','meta',
      'magdalena','boyacÃ¡','cesar','risaralda','caldas','sucre','quindÃ­o','chocÃ³','arauca',
      'casanare','putumayo','la guajira','amazonas','guainÃ­a','guaviare','vaupÃ©s','vichada',
      'san andrÃ©s','caquetÃ¡'];

    if (AR.some(x => p.includes(x))) return 'argentina';
    if (UY.some(x => p.includes(x))) return 'uruguay';
    if (CO.some(x => p.includes(x))) return 'colombia';
    return null;
  }
}
