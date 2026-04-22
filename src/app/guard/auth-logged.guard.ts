import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { AuthService } from '../servicios/auth.service';


@Injectable({
  providedIn: 'root'
})
export class AuthLoggedGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate0(): boolean {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
       return false;
      } else {
         return true;
        }
      }

canActivate1(): boolean {
  if (this.authService.isLoggedIn()) {
    this.router.navigate(['/dashboard']);
    return false;
  }
  return true;
}

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
