import { Component, DestroyRef, HostListener, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RagChatComponent } from './componentes/rag-chat/rag-chat.component';
import { AdminService } from './servicios/admin.service';
import { OfflineStatusService } from './servicios/offline-status.service';
import { OfflineSyncService } from './servicios/offline-sync.service';
import { AppToastService } from './servicios/app-toast.service';
import { AuthService } from './servicios/auth.service';
import { interval, of } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, RagChatComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'pruebaw';
  showConnectionIndicator = false;
  private readonly destroyRef = inject(DestroyRef);

  private readonly ADMIN_SEQ = ['d', 'r', 'l', 'm'];
  private adminKeyBuf: string[] = [];
  private adminKeyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private router: Router,
    private adminService: AdminService,
    private toast: AppToastService,
    readonly offlineStatus: OfflineStatusService,
    readonly offlineSync: OfflineSyncService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.startSessionGuard();
  }

  private startSessionGuard(): void {
    interval(20_000).pipe(
      takeUntilDestroyed(this.destroyRef),
      filter(() => this.authService.isLoggedIn()),
      switchMap(() => {
        const code = localStorage.getItem('userCode')!;
        return this.authService.getUserCode(code).pipe(catchError(() => of(null)));
      }),
      filter(ac => !!ac && ac.disabled === true)
    ).subscribe(() => {
      this.authService.logout();
      this.toast.error('Tu acceso fue desactivado por el administrador. Contactá al soporte.', 'Sesión desactivada');
      this.router.navigate(['/']);
    });
  }

  @HostListener('document:keydown', ['$event'])
  onSequenceKey(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement).tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    const key = event.key.toLowerCase();
    this.adminKeyBuf.push(key);
    if (this.adminKeyBuf.length > this.ADMIN_SEQ.length) this.adminKeyBuf.shift();

    if (this.adminKeyTimer) clearTimeout(this.adminKeyTimer);
    this.adminKeyTimer = setTimeout(() => { this.adminKeyBuf = []; }, 2500);

    if (this.adminKeyBuf.join('') === this.ADMIN_SEQ.join('')) {
      this.adminKeyBuf = [];
      this.triggerAdmin();
    }
  }

  private triggerAdmin(): void {
    this.adminService.setReturnUrl(this.router.url);
    if (this.adminService.isLoggedIn()) {
      this.router.navigate(['/admin-generate-code']);
      return;
    }
    this.router.navigate(['/'], { queryParams: { admin: '1' } });
  }

  @HostListener('document:keydown.control.alt.c', ['$event'])
  onConnectionShortcut(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    this.showConnectionIndicator = !this.showConnectionIndicator;
  }

  async triggerManualSync(): Promise<void> {
    if (this.offlineSync.isSyncing()) {
      this.toast.info('La sincronizacion ya esta en curso.', 'Sincronizando');
      return;
    }

    if (!this.offlineStatus.isOnline()) {
      this.toast.warning('Necesitas conexion para sincronizar los cambios pendientes.', 'Sin conexion');
      return;
    }

    if (!this.offlineSync.hasPendingOps()) {
      this.toast.info('No hay cambios pendientes para sincronizar.', 'Todo al dia');
      return;
    }

    this.toast.info('Iniciando sincronizacion manual...', 'Sincronizacion');
    await this.offlineSync.syncPendingOps();
  }
}
