import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../servicios/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ProvinciaService } from '../../servicios/provincia.service';
import Swal from 'sweetalert2';
declare var bootstrap: any;

interface Provincia {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],

  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit{

  code: string = '';
  email: string = '';
  username: string = '';
  telefono: string = '';
  pais: string = '';
  provincia:string = '';
  isAuthenticated: boolean = false;

  password: string = '';
  isContentVisible: boolean = false;
  websiteUrl: string = "https://wa.link/9lbeyq";

  errorMessage: string = '';
  successMessage: string = '';
  modal:boolean = false;
  isFormValid: boolean = false;
  provincias: Provincia[] = [];
   countries: string[] = ['Argentina', 'Colombia', 'Peru'];

  @ViewChild('exampleModal') exampleModal!: ElementRef;

constructor(private authService: AuthService,
  private route:Router,
  private renderer: Renderer2,
  private toastr: ToastrService,
  private provinciaService: ProvinciaService){}

  ngOnInit(): void {
//  this.getProvincias();

  }






login(): void {
  if (this.code.trim().length === 0) {
    Swal.fire('Error', 'Debe ingresar su código', 'error');
    return;
  }
  this.authService.login(this.code).subscribe(
    response => {
      if (response.email && response.email !== 'Código no encontrado' && response.email !== 'Código existe pero no asignado a un usuario') {
        this.isAuthenticated = true;
        this.email = response.email;
        //localStorage.clear();
        console.log('userData guardado en login:', response);
        this.route.navigate(['dashboard']);
        Swal.fire('Éxito', 'Login exitoso', 'success');
        localStorage.setItem('userCode', this.code);
        localStorage.setItem('userEmail', this.email);
        localStorage.setItem('userData', JSON.stringify(response)); // Guardar objeto completo
      } else {
        Swal.fire('Error', response.email || 'Error al iniciar sesión', 'error');
      }
    },
    error => {
      const msg = error.error?.email || error.message || 'Error al iniciar sesión';
      Swal.fire('Error', msg, 'error');
    }
  );
}



    register(): void {
    this.authService.assignEmail({
      code: this.code,
      email: this.email,
      //username: this.username,
      telefono: this.telefono,
       pais: this.pais,
      provincia: this.provincia
    }).subscribe(
      response => {
        if (response.message === 'Datos asignados con éxito') {
          Swal.fire('Éxito', response.message, 'success');
          console.log(response.message)
           this.clearForm();
        } else {
          Swal.fire('Error', response.message, 'error');
        }
      },
      error => {
        Swal.fire('Error', error.message, 'error');
      }
    );
  }

    validateForm(): void {
      this.isFormValid = this.code.trim().length > 0 &&
      this.email.trim().length > 0 &&
      //this.username.trim().length > 0 &&
      this.telefono.trim().length > 0 &&
      this.provincia.trim().length > 0 &&
      this.pais.trim().length > 0;
    }






   getProvincias(): void {
    this.provinciaService.getAllProvincias().subscribe(
      response => {
        this.provincias = response;
        console.log('provincias', response)
      },
      error => {
        Swal.fire('Error', 'Error al cargar las provincias', 'error');
      }
    );
  }




 onPaisChange(): void {
    if (this.pais) {
      this.provincia = ''; // Clear provincia on pais change
      this.provinciaService.getProvinciasByPais(this.pais).subscribe(
        response => {
          this.provincias = response;
        },
        error => {
          Swal.fire('Error', 'Error al cargar las provincias', 'error');
        }
      );
    } else {
      this.provincias = [];
    }
    this.validateForm();
  }


    ocultarContenido(): void {
    this.isContentVisible = false;
  }

  openCalculadora(): void {
    window.open('https://metroapp.site/calculadora_materiales.html', '_blank');
    }



openWebsite(): void {
  const phone = '54 9 11 2863-4744'; // Reemplaza con el número real
  const text = 'Hola! quiero una clave de membresía para "METRO"';
  const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`;
  const fallbackUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
  try {
    window.location.href = whatsappUrl;
  } catch {
    window.location.href = fallbackUrl;
  }
}

    shareOnWhatsApp(): void {
      const url = 'www.metroapp.site';
      const text = `METRO, la app con precios de la construcción. Hacé tus presupuestos más fácil y rápido. ${url}`;
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(text)}`; window.location.href = whatsappUrl;
    }

    clearForm(): void {
      this.code = '';
      this.email = '';
      //this.username = '';
      this.telefono = '';
      this.pais = '';
      this.provincia = '';
      this.isFormValid = false;
    }
}
