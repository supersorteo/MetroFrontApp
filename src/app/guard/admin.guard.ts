import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminService } from '../servicios/admin.service';

export const AdminGuard: CanActivateFn = () => {
  const adminService = inject(AdminService);
  const router = inject(Router);
  if (adminService.isLoggedIn()) return true;
  router.navigate(['/']);
  return false;
};
