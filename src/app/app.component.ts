import { Component, HostListener } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AdminService } from './servicios/admin.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'pruebaw';

  constructor(
    private router: Router,
    private adminService: AdminService
  ) {}

  @HostListener('document:keydown.control.alt.m', ['$event'])
  onAdminShortcut(event: KeyboardEvent): void {
    event.preventDefault();

    if (this.adminService.isLoggedIn()) {
      this.router.navigate(['/admin-generate-code']);
      return;
    }

    this.router.navigate(['/'], {
      queryParams: { admin: '1' }
    });
  }
}
