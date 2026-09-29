import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { AuthService } from '../servicios/auth.service';
import { hasAcceptedTerms } from '../core/terms/terms.util';


@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}



canActivate(route: ActivatedRouteSnapshot): boolean {
  if (this.authService.isTrialMode()) return true;
  if (this.authService.isLoggedIn()) {
    const userCode = localStorage.getItem('userCode') || '';
    const isDashboard = route.routeConfig?.path === 'dashboard';
    if (!isDashboard && !hasAcceptedTerms(userCode)) {
      this.router.navigate(['/dashboard']);
      return false;
    }
    return true;
  }
  this.router.navigate(['']);
  return false;
}

}

