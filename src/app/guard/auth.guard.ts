import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../servicios/auth.service';


@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate0(): boolean {

    if (this.authService.isLoggedIn()) {
      return true;
    } else {
      this.router.navigate(['']);
      return false;
    }
  }

  canActivate1(): boolean {
  const isTrial = localStorage.getItem('trialMode') === 'true';

  if (this.authService.isLoggedIn() || isTrial) {
    return true;
  } else {
    this.router.navigate(['']);
    return false;
  }
}

canActivate(): boolean {
  if (this.authService.isLoggedIn() || this.authService.isTrialMode()) {
    return true;
  }
  this.router.navigate(['']);
  return false;
}

}

