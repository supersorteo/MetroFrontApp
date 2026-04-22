import { CommonModule, Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../servicios/auth.service';
import { Admin, AdminService } from '../../servicios/admin.service';

interface AccessCode {
  code: string;
  email: any;
  pais?: string;
  tipo?: string;
  username?: string;
  telefono?: string;
  provincia?: string;
  fechaRegistro?: any;
  fechaVencimiento?: any;
  remainingTime?: string;
}

@Component({
  selector: 'app-generate-code',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './generate-code.component.html',
  styleUrl: './generate-code.component.scss'
})
export class GenerateCodeComponent implements OnInit, OnDestroy {

  admin!: Admin;

  code: string = '';
  successMessage = '';
  errorMessage = '';

  codes: AccessCode[] = [];
  filteredCodes: AccessCode[] = [];
  generatedCodes: AccessCode[] = [];

  filterText = '';
  codeCount3 = 1;
  codeCount6 = 1;

  currentPage = 1;
  itemsPerPage = 8;
  totalPages = 0;

  // Panel visibility
  showGenerate3Panel = false;
  showGenerate6Panel = false;
  showGeneratedModal = false;
  showEditAdminPanel = false;

  // Confirm toast
  confirmToast: { icon: string; title: string; message: string; position: 'top' | 'bottom'; action: () => void } | null = null;

  // Edit admin form
  editAdminNombre = '';
  editAdminUsername = '';
  editAdminPassword = '';
  editAdminPasswordNew = '';
  editAdminError = '';
  showEditPassword = false;
  showEditPasswordNew = false;

  // Stats
  totalCodes = 0;
  activeCodes = 0;
  expiredCodes = 0;
  unregisteredCodes = 0;

  private timer: any;

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router,
    private toastr: ToastrService,
    private location: Location
  ) {}

  ngOnInit(): void {
    const admin = this.adminService.getCurrentAdmin();
    if (!admin) { this.router.navigate(['/']); return; }
    this.admin = admin;
    this.loadCodes();
    this.timer = setInterval(() => this.updateRemainingTimes(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  logout(): void {
    this.showConfirm(
      '🚪', 'Cerrar sesión', '¿Seguro que querés salir del panel?', 'top',
      () => { this.adminService.logout(); this.router.navigate(['/']); }
    );
  }

  goBack(): void {
    this.location.back();
  }

  private showConfirm(icon: string, title: string, message: string, position: 'top' | 'bottom', action: () => void): void {
    this.confirmToast = { icon, title, message, position, action };
  }

  confirmYes(): void {
    if (this.confirmToast) { this.confirmToast.action(); }
    this.confirmToast = null;
  }

  confirmNo(): void {
    this.confirmToast = null;
  }

  // ── Code loading ───────────────────────────────────────────

  loadCodes(): void {
    this.authService.getCodesByPais(this.admin.pais).subscribe({
      next: response => {
        this.codes = response.map(code => ({
          ...code,
          tipo: code.code.length === 5 ? '3 meses' : '6 meses',
          fechaRegistro: code.fechaRegistro || '',
          fechaVencimiento: code.fechaVencimiento || '',
        })).sort((a, b) => {
          const dA = new Date(a.fechaRegistro).getTime();
          const dB = new Date(b.fechaRegistro).getTime();
          if (isNaN(dA) || isNaN(dB)) return isNaN(dA) ? 1 : -1;
          return dB - dA;
        });
        this.applyFilter();
        this.computeStats();
      },
      error: () => this.toastr.error('Error al cargar los códigos', 'Error')
    });
  }

  applyFilter(): void {
    const f = this.filterText.toLowerCase();
    this.filteredCodes = f
      ? this.codes.filter(c =>
          (c.code?.toLowerCase().includes(f)) ||
          (c.email?.toLowerCase().includes(f)) ||
          (c.username?.toLowerCase().includes(f)) ||
          (c.telefono?.toLowerCase().includes(f)) ||
          (c.provincia?.toLowerCase().includes(f)) ||
          (c.fechaRegistro?.toLowerCase().includes(f)) ||
          (c.fechaVencimiento?.toLowerCase().includes(f))
        )
      : [...this.codes];
    this.currentPage = 1;
    this.updatePagination();
  }

  computeStats(): void {
    const now = new Date().getTime();
    this.totalCodes = this.codes.length;
    this.unregisteredCodes = this.codes.filter(c => !c.email).length;
    this.activeCodes = this.codes.filter(c => {
      if (!c.fechaVencimiento) return false;
      const exp = new Date(c.fechaVencimiento).getTime();
      return !isNaN(exp) && exp > now;
    }).length;
    this.expiredCodes = this.codes.filter(c => {
      if (!c.fechaVencimiento) return false;
      const exp = new Date(c.fechaVencimiento).getTime();
      return !isNaN(exp) && exp <= now;
    }).length;
  }

  filterCodes(): void {
    this.applyFilter();
  }

  // ── Generate ───────────────────────────────────────────────

  validateAndGenerateCode(): void {
    if (!this.code.trim()) { this.toastr.error('Debe ingresar un código', 'Error'); return; }
    this.authService.agregarCode({ code: this.code, email: null, pais: this.admin.pais }).subscribe({
      next: response => {
        if (response.message === 'Código agregado con éxito') {
          this.toastr.success(response.message, 'Éxito');
          this.code = '';
          this.loadCodes();
        } else {
          this.toastr.error(response.message, 'Error');
        }
      },
      error: err => this.toastr.error(err.message, 'Error')
    });
  }

  generateCodes(months: 3 | 6): void {
    const count = months === 3 ? this.codeCount3 : this.codeCount6;
    if (count <= 0) { this.toastr.error('Cantidad inválida', 'Error'); return; }
    const length = months === 3 ? 5 : 6;
    const newCodes: AccessCode[] = Array.from({ length: count }, () => ({
      code: this.randomCode(length),
      email: null,
      pais: this.admin.pais,
      tipo: months === 3 ? '3 meses' : '6 meses'
    }));
    this.generatedCodes = newCodes;
    this.showGenerate3Panel = false;
    this.showGenerate6Panel = false;
    this.showGeneratedModal = true;

    this.authService.agregarCodes(newCodes).subscribe({
      next: res => {
        this.toastr.success(res.message, 'Éxito');
        this.loadCodes();
      },
      error: err => this.toastr.error(err.message, 'Error')
    });
  }

  randomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  // ── Delete ─────────────────────────────────────────────────

  confirmDeleteCode(code: string): void {
    this.showConfirm(
      '🗑️', 'Eliminar código', `¿Eliminar el código ${code}? Esta acción no se puede deshacer.`, 'bottom',
      () => {
        this.authService.deleteCode(code).subscribe({
          next: () => { this.toastr.success('Código eliminado', 'Éxito'); this.loadCodes(); },
          error: () => this.toastr.error('Error al eliminar', 'Error')
        });
      }
    );
  }

  copyToClipboard(code: string): void {
    navigator.clipboard.writeText(code).then(
      () => this.toastr.success('Copiado', 'Éxito'),
      () => this.toastr.error('Error al copiar', 'Error')
    );
  }

  // ── Pagination ─────────────────────────────────────────────

  getPaginatedCodes(): AccessCode[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredCodes.slice(start, start + this.itemsPerPage);
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredCodes.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) this.currentPage = 1;
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // ── Timers ─────────────────────────────────────────────────

  updateRemainingTimes(): void {
    this.filteredCodes.forEach(c => {
      if (c.fechaVencimiento) c.remainingTime = this.calcRemaining(c.fechaVencimiento);
    });
  }

  calcRemaining(fechaVencimiento: string): string {
    if (!fechaVencimiento) return '—';
    const diff = new Date(fechaVencimiento).getTime() - Date.now();
    if (isNaN(diff)) return 'Fecha inválida';
    if (diff <= 0) return 'Expirado';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${d}d ${h}h ${m}m ${s}s`;
  }

  // ── Edit admin ──────────────────────────────────────────────

  openEditAdmin(): void {
    this.editAdminNombre   = this.admin.nombre;
    this.editAdminUsername = this.admin.username;
    this.editAdminPassword = this.admin.password;
    this.editAdminPasswordNew = '';
    this.editAdminError = '';
    this.showEditAdminPanel = true;
  }

  saveAdminChanges(): void {
    if (!this.editAdminUsername.trim()) {
      this.editAdminError = 'El usuario no puede estar vacío.'; return;
    }
    const newPass = this.editAdminPasswordNew.trim() || this.editAdminPassword;
    this.adminService.updateAdmin(this.admin.id, {
      nombre:   this.editAdminNombre,
      username: this.editAdminUsername,
      password: newPass,
    }).subscribe(updated => {
      if (!updated) {
        this.editAdminError = 'Error al guardar cambios.';
        return;
      }
      this.admin = this.adminService.getCurrentAdmin()!;
      this.toastr.success('Perfil actualizado', 'Éxito');
      this.showEditAdminPanel = false;
    });
  }
}
