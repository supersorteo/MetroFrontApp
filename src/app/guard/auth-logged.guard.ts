import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
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

canActivate(): boolean {
  if (this.authService.isLoggedIn()) {
    this.router.navigate(['/dashboard']);
    return false;
  }
  return true;
}


    }
