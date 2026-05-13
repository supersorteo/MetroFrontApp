import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Cliente, ClienteService } from '../../servicios/cliente.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { OfflineLocalStoreService } from '../../servicios/offline-local-store.service';
import { UiDialogService } from '../../core/services/ui-dialog.service';

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
    private clienteService: ClienteService,
    private localStore: OfflineLocalStoreService,
    private uiDialog: UiDialogService
  ) {}

  private getStoredCliente(id: number): Cliente | null {
    const selectedClienteRaw = localStorage.getItem('selectedCliente');
    if (selectedClienteRaw) {
      try {
        const selectedCliente = JSON.parse(selectedClienteRaw);
        if (Number(selectedCliente?.id) === id) {
          return selectedCliente as Cliente;
        }
      } catch {
      }
    }

    const storedKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith('clientData_') || key.startsWith('clientData_temp_')
    );

    for (const key of storedKeys) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        if (Number(parsed?.id) === id) {
          return parsed as Cliente;
        }
      } catch {
      }
    }

    return null;
  }

  private persistClienteLocally(cliente: Cliente): void {
    if (!cliente.id) {
      return;
    }

    localStorage.setItem(`clientData_${cliente.id}`, JSON.stringify(cliente));
    localStorage.setItem('selectedCliente', JSON.stringify(cliente));
    localStorage.setItem('selectedClienteId', String(cliente.id));
    localStorage.setItem('reloadClientes', 'true');
    this.localStore.upsertCliente(cliente, Number(cliente.id) < 0 ? 'pending' : 'synced');
    this.localStore.setState(this.dashboardStateKey('selectedCliente'), cliente);
  }

  private dashboardStateKey(name: string): string {
    const userCode = this.cliente.userCode || localStorage.getItem('userCode') || 'anon';
    return `dashboard:${userCode}:${name}`;
  }

  ngOnInit(): void {
    // Eliminar cualquier backdrop de modal y desbloquear scroll
    setTimeout(() => {
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(bd => bd.parentNode?.removeChild(bd));
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    }, 0);
    //const id = Number(this.route.snapshot.paramMap.get('id'));


    const id = Number(this.route.snapshot.paramMap.get('id'));
if (!id) {
  this.errorMsg = 'ID de cliente no válido';
  this.loading = false;
  setTimeout(() => this.router.navigate(['/dashboard']), 2000);
  return;
}

const isTrial = localStorage.getItem('trialMode') === 'true';

if (isTrial) {
  const demoClientes = Object.keys(localStorage)
    .filter(key => key.startsWith('demoCliente_'))
    .map(key => JSON.parse(localStorage.getItem(key) || '{}'));

  const cliente = demoClientes.find(c => Number(c.id) === id);
  if (cliente) {
    this.cliente = { ...cliente };
    this.loading = false;
  } else {
    this.errorMsg = 'No se pudo cargar el cliente demo';
    this.loading = false;
    setTimeout(() => this.router.navigate(['/dashboard']), 2000);
  }
  return;
}


    if (id) {
      this.clienteService.getClienteById(id).subscribe({
        next: (data) => {
          this.cliente = {
            ...data,
            empresaId: data.empresaId // Asegura que empresaId se asigne correctamente
          };
          this.loading = false;
        },
        error: async () => {
          const indexedCliente = await this.localStore.getClienteByLocalOrServerId(id);
          const storedCliente = indexedCliente || this.getStoredCliente(id);
          if (storedCliente) {
            this.cliente = {
              ...storedCliente,
              empresaId: storedCliente.empresaId
            };
            this.loading = false;
            return;
          }

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

  async onSubmit() {
    if (!this.cliente.name?.trim()) {
      this.uiDialog.warning({ title: 'Campo obligatorio', text: 'El nombre del cliente no puede estar vacío.' });
      return;
    }

    const confirmed = await this.uiDialog.confirm({
      title: '¿Guardar cambios?',
      text: `Se actualizarán los datos de "${this.cliente.name}".`,
      confirmText: 'Guardar cambios',
      cancelText: 'Cancelar',
      tone: 'primary',
      icon: 'question'
    });
    if (!confirmed) return;

    const isTrial = localStorage.getItem('trialMode') === 'true';
    if (isTrial) {
      const key = `demoCliente_${this.cliente.id}`;
      localStorage.setItem(key, JSON.stringify(this.cliente));
      localStorage.setItem('reloadClientes', 'true');
      this.uiDialog.success({ title: 'Guardado', text: `Los datos de "${this.cliente.name}" se actualizaron correctamente.` }).then(() => {
        this.router.navigate(['/dashboard']);
      });
      return;
    }

    if (!this.cliente.id) {
      this.uiDialog.error({ title: 'Error', text: 'ID de cliente no válido' });
      return;
    }

    this.loading = true;
    this.clienteService.updateCliente(this.cliente.id, this.cliente).subscribe({
      next: (clienteActualizado) => {
        this.loading = false;
        this.persistClienteLocally({ ...this.cliente, ...clienteActualizado });
        this.uiDialog.success({ title: 'Guardado', text: `Los datos de "${this.cliente.name}" se actualizaron correctamente.` }).then(() => {
          this.router.navigate(['/dashboard']);
        });
      },
      error: (err) => {
        this.loading = false;
        this.uiDialog.error({ title: 'Error', text: err.message || 'Error al editar el cliente' });
      }
    });
  }

  async cancelar() {
    const confirmed = await this.uiDialog.confirmDiscardChanges();
    if (confirmed) this.router.navigate(['/dashboard']);
  }
}
