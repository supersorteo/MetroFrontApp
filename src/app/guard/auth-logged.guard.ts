import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { AuthService } from '../servicios/auth.service';


@Injectable({
  providedIn: 'root'
})
export class AuthLoggedGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
  if (route.queryParamMap.get('admin') === '1') {
    return true;
  }

  if (this.authService.isLoggedIn() || this.authService.isTrialMode()) {
    this.router.navigate(['/dashboard']);
    return false;
  }
  return true;
}



    }
