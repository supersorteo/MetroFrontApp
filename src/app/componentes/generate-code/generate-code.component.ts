import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../servicios/auth.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
interface AccessCode {
  code: string;
  email: any;
  tipo?: string;
  username?: string;
  telefono?: string;
  provincia?: string;
  fechaRegistro?: any;
  fechaVencimiento?: any;
  remainingTime?: string;
}
@Component({
  selector: 'app-generate-code',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './generate-code.component.html',
  styleUrl: './generate-code.component.scss'
})
export class GenerateCodeComponent implements OnInit {

  code: string = '';

  successMessage: string = '';
  errorMessage: string = '';
  codes: AccessCode[] = [];
  //codes:any[]=[];
  filteredCodes: AccessCode[] = [];
  generatedCodes: AccessCode[] = [];
  showGeneratedCodesModal: boolean = false;
  generateCodesModal6:boolean = false;
  filterText: string = '';
  codeCount3: number = 1;
  codeCount6: number = 1;
  //remainingTime: string = '';

  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 0;

  constructor(private authService: AuthService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.loadCodes();


    setInterval(
      () => {
      this.updateRemainingTimes();
    }, 1000);

  }


  validateAndGenerateCode(): void {
    if (this.code.trim().length === 0) {
      this.toastr.error('Debe ingresar un código', 'Error');
      return;
    }
    this.generateCode();
  }

  generateCode(): void {
    this.authService.agregarCode({
      code: this.code,
      email: null
    }).subscribe(
      response => {
        if (response.message === 'Código agregado con éxito') {
          this.successMessage = response.message;
          this.errorMessage = '';
          this.toastr.success(this.successMessage, 'Éxito');
          this.loadCodes();
          console.log('codigo: ', this.code)
        } else {
          this.errorMessage = response.message;
          this.successMessage = '';
          this.toastr.error(this.errorMessage, 'Error');
        }
      }, error => {
        this.errorMessage = error.message;
        this.successMessage = '';
        this.toastr.error(this.errorMessage, 'Error');
      } );
    }




        loadCodes(): void {
          this.authService.getAllCodes().subscribe(
              response => {
                  this.codes = response
                      .map(code => {
                          const fechaRegistro = code.fechaRegistro || '';
                          const fechaVencimiento = code.fechaVencimiento || '';
                          console.log('Fecha de registro:', fechaRegistro);
                          console.log('Fecha de vencimiento:', fechaVencimiento);
                          return {
                              ...code,
                              tipo: code.code.length === 5 ? '3 meses' : '6 meses',
                              fechaRegistro,
                              fechaVencimiento
                          };
                      })
                      .sort((a, b) => {
                          const dateA = new Date(a.fechaRegistro).getTime();
                          const dateB = new Date(b.fechaRegistro).getTime();
                          if (isNaN(dateA) || isNaN(dateB)) {
                              return isNaN(dateA) ? 1 : -1;
                          }
                          return dateB - dateA;
                      });
                  this.filteredCodes = this.codes;
                  this.updatePagination();
                  console.log(this.codes);
              },
              error => {
                  this.toastr.error('Error al cargar los códigos', 'Error');
              }
          );
      }



      filterCodes(): void {
        const filter = this.filterText.toLowerCase();
        this.filteredCodes = this.codes.filter(
            code =>
                (code.code?.toLowerCase().includes(filter) || false) ||
                (code.email?.toLowerCase().includes(filter) || false) ||
                (code.username?.toLowerCase().includes(filter) || false) ||
                (code.telefono?.toLowerCase().includes(filter) || false) ||
                (code.provincia?.toLowerCase().includes(filter) || false) ||
                (code.fechaRegistro?.toLowerCase().includes(filter) || false) ||
                (code.fechaVencimiento?.toLowerCase().includes(filter) || false)
        );
        this.updatePagination();
    }


      editCode(item: AccessCode): void {
        console.log('Editar código:', item);
      }

      deleteCode(code: string): void {
        this.authService.deleteCode(code).subscribe( response => {
          this.toastr.success('Código eliminado con éxito', 'Éxito');
          this.loadCodes();
        }, error => {
          this.toastr.error('Error al eliminar el código', 'Error');
        } );
      }

      confirmDeleteCode(code: string): void {
        if (window.confirm('¿Estás seguro de eliminar este código?')) {
          this.deleteCode(code);
        }
    }


      generateCodes(months: number): void {

        let codeCount = months === 3 ? this.codeCount3 : this.codeCount6;
        if (codeCount <= 0) {

          this.toastr.error('Debe ingresar la cantidad de códigos que desea generar', 'Error');
          return;
        }

        let codeLength = months === 3 ? 5 : 6;
        let codes: AccessCode[] = [];
        for (let i = 0; i < codeCount; i++) {
          codes.push({
            code: this.generateRandomCode(codeLength),
            email: null, tipo: months === 3 ? '3 meses' : '6 meses'
          });
        }
        this.generatedCodes = codes;
        this.generateCodesModal6 = false;
        this.showGeneratedCodesModal = true;

        console.log(`Códigos de ${months} meses:`);
        codes.forEach(code => console.log(code.code));
        this.authService.agregarCodes(codes).subscribe(
          response => {
            this.toastr.success(response.message, 'Éxito');
            this.loadCodes();
          },
          error => {
            this.toastr.error(error.message, 'Error');
          } );
        }

    generateRandomCode(length: number): string {
      let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      } return result;
    }



    updateRemainingTimes(): void {
      this.filteredCodes.forEach(
        code => {
          if (code.fechaVencimiento) {
            code.remainingTime = this.calculateRemainingTime(code.fechaVencimiento);
          }
        });
      }

      calculateRemainingTime(fechaVencimiento: string): string {
        if (!fechaVencimiento) {
          return 'Fecha de vencimiento no disponible';
        }
        const now = new Date().getTime();
        const expiryDate = new Date(fechaVencimiento).getTime();
        if (isNaN(expiryDate)) {
          return 'Fecha inválida';
        }
        const timeDiff = expiryDate - now;
        if (timeDiff <= 0) {
          return 'Código expirado';
        }
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000); return `${days}d ${hours}h ${minutes}m ${seconds}s restantes`;
      }

      copyToClipboard(code: string): void {
        navigator.clipboard.writeText(code).then(
          () => {
            this.toastr.success('Código copiado al portapapeles', 'Éxito');
            console.log('Código', code)
          },
          err => {
            this.toastr.error('Error al copiar el código', 'Error');
          } );
        }

        closeGeneratedCodesModal(): void {
          this.showGeneratedCodesModal = false;
      }

      openModalGenerated() {
       this.generateCodesModal6 = true
        }
        stopEventPropagation(event: MouseEvent): void {
          event.stopPropagation();
        }


        changePage(page: number): void {
          if (page < 1 || page > this.totalPages) {
            return;
          } this.currentPage = page;
        }

        getPaginatedCodes(): AccessCode[] {
          const startIndex = (this.currentPage - 1) * this.itemsPerPage;
          return this.filteredCodes.slice(startIndex, startIndex + this.itemsPerPage);
        }

        updatePagination(): void {
          this.totalPages = Math.ceil(this.filteredCodes.length / this.itemsPerPage);
        }

}
