import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../servicios/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

declare var bootstrap: any;

interface AccessCode { code: string; email: string; username: string; telefono: string; provincia: string; fechaRegistro: string; fechaVencimiento: string; }
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit{
  empresaName: string = '';
  empresaPhone: string = '';
  empresaEmail: string = '';
  additionalDetailsEmpresa: string = '';
  clientName: string = '';
  clientContact: string = '';
  budgetDate: string = '';
  additionalDetailsClient: string = '';
  porcentajeBajar!: number;
  porcentajeSubir!: number ;

  userCode: string = '';
  userData: any | null = null;
  remainingTime: string = '';
  @ViewChild('imageInput') imageInput!: ElementRef;
  @ViewChild('modalImagePreview') modalImagePreview!: ElementRef;
  @ViewChild('uploadMessage') uploadMessage!: ElementRef;

  constructor(private authService: AuthService, private route:Router,  private toastr: ToastrService ){}

  ngOnInit() {
    this.loadFormData();
    this.loadImageFromLocalStorage();
    this.loadUserCode()
    /*setInterval(() => {
      this.updateRemainingTime();
    }, 60000);*/


    setInterval(() => {
      if (this.userData?.fechaVencimiento) {
        this.calculateRemainingTime(this.userData.fechaVencimiento);
      }
    }, 1000);

  }

  logout(): void {
    this.authService.logout();
    this.route.navigate(['']);
    this.toastr.success('Logout exitoso', 'Éxito');
  }

  mostrarCodigo2() {
    const codigo = document.getElementById('codigo') as HTMLElement;
    if (codigo.style.display === 'none') {
      codigo.style.display = 'block';
    } else {
      codigo.style.display = 'none';
    }

  }

  abrirGoogleSheets2() {
    const url = "https://drive.google.com/file/d/1dZcSD_5lt3OsDE44SN91t5NcUyvQtl-N/view?usp=sharing";
    window.open(url, "_blank");
  }

  loadFormData() {
    const empresaData = JSON.parse(localStorage.getItem('empresaData') || '{}');
    this.empresaName = empresaData.empresaName || '';
    this.empresaPhone = empresaData.empresaPhone || '';
    this.empresaEmail = empresaData.empresaEmail || '';
    this.additionalDetailsEmpresa = empresaData.additionalDetailsempresa || '';
    const uploadedImage = localStorage.getItem('uploadedImage');
    if (uploadedImage) {
      const mainPreview = document.getElementById('fixedImageIcon') as HTMLImageElement;
      const mainPreview2 = document.getElementById('fixedImageIconmodal') as HTMLImageElement;
      mainPreview.src = uploadedImage;
      mainPreview.style.display = 'block';
      mainPreview2.src = uploadedImage;
      mainPreview2.style.display = 'block';
    }
  }

  loadImageFromLocalStorage() {
    const uploadedImage = localStorage.getItem('uploadedImage');
    if (uploadedImage) {
      const modalPreview = this.modalImagePreview.nativeElement as HTMLImageElement;
      modalPreview.src = uploadedImage;
      modalPreview.style.display = 'block';
      const mainPreview = document.getElementById('fixedImageIcon') as HTMLImageElement;
      const mainPreview2 = document.getElementById('fixedImageIconmodal') as HTMLImageElement;
      mainPreview.src = uploadedImage;
      mainPreview.style.display = 'block';
      mainPreview2.src = uploadedImage;
      mainPreview2.style.display = 'block';
    }
  }

  uploadImage() {
    const fileInput = this.imageInput.nativeElement as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const imageBase64 = e.target.result;
        localStorage.setItem('uploadedImage', imageBase64);
        const modalPreview = this.modalImagePreview.nativeElement as HTMLImageElement;
        modalPreview.src = imageBase64;
        modalPreview.style.display = 'block';
        const mainPreview = document.getElementById('fixedImageIcon') as HTMLImageElement;
        const mainPreview2 = document.getElementById('fixedImageIconmodal') as HTMLImageElement;
        mainPreview.src = imageBase64; mainPreview.style.display = 'block';
        mainPreview2.src = imageBase64;
        mainPreview2.style.display = 'block';
        this.uploadMessage.nativeElement.style.display = 'block';
        setTimeout(() => {
          const imageModal = new bootstrap.Modal(document.getElementById('imageModal')!);
          imageModal.hide();
        }, 1000);
      };
           reader.readAsDataURL(file); } else {
            alert('Por favor, selecciona una imagen.');
          }
    }

    saveFormData() {
      const formData = {
        empresaName: this.empresaName,
        empresaPhone: this.empresaPhone,
        empresaEmail: this.empresaEmail,
        additionalDetailsempresa: this.additionalDetailsEmpresa,
        image: localStorage.getItem('uploadedImage'),
       };
       localStorage.setItem('empresaData', JSON.stringify(formData));
       const successAlert = document.getElementById('successAlert') as HTMLDivElement;
       successAlert.style.display = 'block';
       setTimeout(
        () => {
        successAlert.style.display = 'none';
      }, 2000);
    }

    saveClientData() {
      const clientData = {
        clientName: this.clientName,
        clientContact: this.clientContact,
        budgetDate: this.budgetDate,
        additionalDetailsClient: this.additionalDetailsClient,
      };
      localStorage.setItem('clientData', JSON.stringify(clientData));
      const confirmationMessage = document.getElementById('confirmationMessage') as HTMLHeadingElement;
      confirmationMessage.style.display = 'block';
      setTimeout(
        () => {
          confirmationMessage.style.display = 'none';
        }, 2000);
      }


      disminuirPrecios() {

        if (isNaN(this.porcentajeBajar) || this.porcentajeBajar === 0) {
          alert("Por favor, ingrese un porcentaje válido para bajar.");
          return;
        }

        console.log("Disminuir precios en", this.porcentajeBajar, "%");
      }


      ajustarPrecios() {

        if (isNaN(this.porcentajeSubir) || this.porcentajeSubir === 0) {
          alert("Por favor, ingrese un porcentaje válido.");
          return;
        }

        console.log("Aumentar precios en", this.porcentajeSubir, "%");
      }


      loadUserCode(): void {
        this.userCode = localStorage.getItem('userCode') || '';
        if (this.userCode) {
          this.fetchUserData();
        } else {
          this.toastr.error('Código de usuario no encontrado en el localStorage', 'Error');
        }
      }




      /*fetchUserData1(): void {
        this.authService.getUserCode(this.userCode).subscribe(
          response => {
            this.userData = response;
            console.log('Datos del usuario:', response);
            this.updateRemainingTime();
          },
          error => {
            this.toastr.error('Error al obtener los datos del usuario', 'Error');
           } );
          }*/

          fetchUserData(): void {
            this.authService.getUserCode(this.userCode).subscribe(
              response => {
                this.userData = response;
                console.log('Datos del usuario:', response);
                if (this.userData.fechaVencimiento) {
                  this.calculateRemainingTime(this.userData.fechaVencimiento);
                }
              },
              error => {
                this.toastr.error('Error al obtener los datos del usuario', 'Error');
              } );
            }


      calculateRemainingTime(fechaVencimiento: string): void {
        if (!fechaVencimiento) {
          this.remainingTime = 'Fecha de vencimiento no disponible';
          return;
        }
        const now = new Date().getTime();
        const expiryDate = new Date(fechaVencimiento).getTime();
        if (isNaN(expiryDate)) {
          this.remainingTime = 'Fecha inválida';
          return;
        }
        const timeDiff = expiryDate - now;
        if (timeDiff <= 0) {
          this.remainingTime = 'Código expirado';
          return;
        }
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
        this.remainingTime = `${days}d ${hours}h ${minutes}m ${seconds}s restantes`;
        //console.log('Tiempo restante:', this.remainingTime);
      }

    }
