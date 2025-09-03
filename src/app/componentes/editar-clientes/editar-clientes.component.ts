import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Cliente, ClienteService } from '../../servicios/cliente.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-editar-clientes',
  standalone: true,
  imports: [CommonModule,FormsModule,],
  templateUrl: './editar-clientes.component.html',
  styleUrl: './editar-clientes.component.scss'
})
export class EditarClientesComponent implements OnInit {
  cliente: Cliente = {
    name: '',
    contact: '',
    budgetDate: '',
    additionalDetails: '',
    userCode: '',
    email: '',
    clave: '',
    direccion: '',
    empresaId: 0 // Valor inicial, se actualizará dinámicamente
  };
  loading: boolean = true;
  errorMsg: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clienteService: ClienteService
  ) {}

  ngOnInit(): void {
    // Eliminar cualquier backdrop de modal y desbloquear scroll
    setTimeout(() => {
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(bd => bd.parentNode?.removeChild(bd));
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    }, 0);
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.clienteService.getClienteById(id).subscribe({
        next: (data) => {
          this.cliente = {
            ...data,
            empresaId: data.empresaId // Asegura que empresaId se asigne correctamente
          };
          console.log('data', data)
          this.loading = false;
        },
        error: (err) => {
          this.errorMsg = 'No se pudo cargar el cliente';
          this.loading = false;
          setTimeout(() => this.router.navigate(['/dashboard']), 2000);
        }
      });
    } else {
      this.errorMsg = 'ID de cliente no válido';
      this.loading = false;
      setTimeout(() => this.router.navigate(['/dashboard']), 2000);
    }
  }

  onSubmit() {
    if (!this.cliente.id) {
      alert('ID de cliente no válido');
      return;
    }
    this.clienteService.updateCliente(this.cliente.id, this.cliente).subscribe({
      next: () => {
        localStorage.setItem('reloadClientes', 'true');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => alert(err.message || 'Error al editar el cliente')
    });
  }

  cancelar() {
    this.router.navigate(['/dashboard']);
  }
}
