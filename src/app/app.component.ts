import { Component, HostListener } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AdminService } from './servicios/admin.service';
import { OfflineStatusService } from './servicios/offline-status.service';
import { OfflineSyncService } from './servicios/offline-sync.service';
import { AppToastService } from './servicios/app-toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'pruebaw';

  constructor(
    private router: Router,
    private adminService: AdminService,
    private toast: AppToastService,
    readonly offlineStatus: OfflineStatusService,
    readonly offlineSync: OfflineSyncService
  ) {}

  @HostListener('document:keydown.control.alt.m', ['$event'])
  onAdminShortcut(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    this.adminService.setReturnUrl(this.router.url);
    if (this.adminService.isLoggedIn()) {
      this.router.navigate(['/admin-generate-code']);
      return;
    }
    this.router.navigate(['/'], { queryParams: { admin: '1' } });
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
