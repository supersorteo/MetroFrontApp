import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Cliente, ClienteService } from '../../servicios/cliente.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { OfflineLocalStoreService } from '../../servicios/offline-local-store.service';
import { UiDialogService } from '../../core/services/ui-dialog.service';
import { PHONE_COUNTRIES, PhoneCountry, validatePhone } from '../../core/utils/phone-validation.util';

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

  phoneCountries = PHONE_COUNTRIES;
  editPrefix: string = '+549';
  editPhone: string = '';
  phoneInvalid = false;
  phoneInvalidMsg = '';

  get selectedCountry(): PhoneCountry | undefined {
    return PHONE_COUNTRIES.find(c => c.code === this.editPrefix);
  }

  validateEditPhone(live = false): void {
    if (!this.editPhone.trim()) { this.phoneInvalid = false; this.phoneInvalidMsg = ''; return; }
    const result = validatePhone(this.editPrefix, this.editPhone, live);
    this.phoneInvalid = !result.valid;
    this.phoneInvalidMsg = result.error ?? '';
  }

  private parseE164(e164: string): void {
    if (!e164) return;
    const country = PHONE_COUNTRIES.find(c => e164.startsWith(c.code));
    this.editPrefix = country?.code ?? '+549';
    this.editPhone = e164.slice(this.editPrefix.length).trim();
  }

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
    this.parseE164(this.cliente.contact);
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
            empresaId: data.empresaId
          };
          this.parseE164(this.cliente.contact);
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
            this.parseE164(this.cliente.contact);
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
    const phoneResult = validatePhone(this.editPrefix, this.editPhone);
    if (!phoneResult.valid) {
      this.uiDialog.warning({ title: 'Teléfono inválido', text: phoneResult.error || 'El número no es válido.' });
      return;
    }
    this.cliente.contact = phoneResult.e164!;

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
