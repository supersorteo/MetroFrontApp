import { Component, HostListener } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AdminService } from './servicios/admin.service';
import { OfflineStatusService } from './servicios/offline-status.service';
import { OfflineSyncService } from './servicios/offline-sync.service';

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
    readonly offlineStatus: OfflineStatusService,
    readonly offlineSync: OfflineSyncService
  ) {}

  @HostListener('document:keydown.control.alt.m', ['$event'])
  onAdminShortcut(event: KeyboardEvent): void {
    event.preventDefault();
    if (this.adminService.isLoggedIn()) {
      this.router.navigate(['/admin-generate-code']);
      return;
    }
    this.router.navigate(['/'], { queryParams: { admin: '1' } });
  }
}
