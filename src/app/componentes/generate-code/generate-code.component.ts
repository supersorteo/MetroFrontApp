import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AccessCode, AuthService } from '../../servicios/auth.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
//interface AccessCode { code: string; email: string; selected?: boolean; }
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
  filteredCodes: AccessCode[] = [];
  //filterText: any;
  filterText: string = '';
  constructor(private authService: AuthService, private toastr: ToastrService) {}

  ngOnInit(): void { this.loadCodes(); }


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
      email: ''
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
          this.codes = response;
          this.filteredCodes = response;
          console.log(response)
        }, error => {
          this.toastr.error('Error al cargar los códigos', 'Error');
        } );
      }


        filterCodes(): void {
          const filter = this.filterText.toLowerCase();
          this.filteredCodes = this.codes.filter(
            code => (
              code.code?.toLowerCase().includes(filter) || false) || (code.email?.toLowerCase().includes(filter) || false)
            );
          }

      editCode(item: AccessCode): void { console.log('Editar código:', item); }

      deleteCode(code: string): void {
        this.authService.deleteCode(code).subscribe( response => {
          this.toastr.success('Código eliminado con éxito', 'Éxito');
          this.loadCodes();
        }, error => {
          this.toastr.error('Error al eliminar el código', 'Error');
        } );
      }

      confirmDeleteCode(code: string): void { if (window.confirm('¿Estás seguro de eliminar este código?')) { this.deleteCode(code); } }

}
