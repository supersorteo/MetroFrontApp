import { CommonModule } from '@angular/common';
import { Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../servicios/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
declare var bootstrap: any;
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],

  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  code: string = '';
  email: string = '';
  username: string = '';
  telefono: string = '';
  provincia:string = '';
  isAuthenticated: boolean = false;

  password: string = '';
  isContentVisible: boolean = false;
  websiteUrl: string = "https://wa.link/9lbeyq";

  errorMessage: string = '';
  successMessage: string = '';
  modal:boolean = false;
  isFormValid: boolean = false;
  @ViewChild('exampleModal') exampleModal!: ElementRef;

constructor(private authService: AuthService, private route:Router, private renderer: Renderer2, private toastr: ToastrService ){}



  login(): void {
     if (this.code.trim().length === 0) {
          this.errorMessage = 'Debe ingresar su código';
           this.successMessage = '';
             console.error(this.errorMessage);
              this.toastr.error(this.errorMessage, 'Error');
                return;
              }
              this.authService.login(this.code).subscribe(response => {
                if (response.email && response.email !== 'Código no encontrado') {
                  this.isAuthenticated = true;
                  this.successMessage = 'Login exitoso';
                  this.errorMessage = '';
                  this.email = response.email;
                  this.route.navigate(['dashboard']);
                  console.log(this.successMessage, response.email);
                  this.toastr.success(this.successMessage, 'Éxito');
                  console.log('Datos del usuario:', { code: this.code, email: this.email });
                  localStorage.setItem('userCode', this.code);
                  localStorage.setItem('userEmail', this.email);

                } else {
                  this.errorMessage = response.email || 'Error al iniciar sesión';
                  this.successMessage = '';
                  console.error(this.errorMessage);
                  this.toastr.error(this.errorMessage, 'Error');
                }
              },
              error => {
                this.errorMessage = error.message;
                this.successMessage = '';
                console.error('Login error:', this.errorMessage);
                this.toastr.error(this.errorMessage, 'Error');
              });
            }



     register1(): void {
      this.authService.assignEmail({ code: this.code, email: this.email }).subscribe(
        response => {
        if (response.message === 'Email asignado con éxito') {
          this.successMessage = response.message;
          this.errorMessage = '';
          console.log(this.successMessage);
          this.toastr.success(this.successMessage, 'Éxito');
        } else {
          this.errorMessage = response.message;
          this.successMessage = '';
          console.log(this.errorMessage);
          this.toastr.error(this.errorMessage, 'Error');
        }
      }, error => {
        this.errorMessage = error.message;
        this.successMessage = '';
        console.log('Register error:', this.errorMessage);
        this.toastr.error(this.errorMessage, 'Error');
      } );
    }


    register(): void {
      this.authService.assignEmail({
        code: this.code,
        email: this.email,
        username: this.username,
        telefono: this.telefono,
        provincia: this.provincia
      }).subscribe(
        response => {
          if (response.message === 'Datos asignados con éxito') {
            this.successMessage = response.message;
            this.errorMessage = '';
            console.log(this.successMessage);
            this.toastr.success(this.successMessage, 'Éxito');
          } else {
            this.errorMessage = response.message;
            this.successMessage = '';
            console.log(this.errorMessage);
            this.toastr.error(this.errorMessage, 'Error');
          }
        }, error => {
          this.errorMessage = error.message;
          this.successMessage = '';
          console.log('Register error:', this.errorMessage);
          this.toastr.error(this.errorMessage, 'Error');
        }
      );
    }

    validateForm(): void {
      this.isFormValid = this.code.trim().length > 0 && this.email.trim().length > 0 && this.username.trim().length > 0 && this.telefono.trim().length > 0 && this.provincia.trim().length > 0;
    }



     validateForm1(): void {
      this.isFormValid = this.code.trim().length > 0 && this.email.trim().length > 0;
    }



        ocultarContenido(): void {
    this.isContentVisible = false;
  }

  openCalculadora(): void {
    window.open('https://metroapp.site/calculadora_materiales.html', '_blank');
    }

    openWebsite(): void {
      window.open(this.websiteUrl, '_blank');
    }

    shareOnWhatsApp(): void {
      const url = 'www.metroapp.site';
      const text = `METRO, la app con precios de la construcción. Hacé tus presupuestos más fácil y rápido. ${url}`;
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(text)}`; window.location.href = whatsappUrl;
    }
}
