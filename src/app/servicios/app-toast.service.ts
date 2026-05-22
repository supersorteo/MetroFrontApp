import { Injectable } from '@angular/core';
import { IndividualConfig, ToastrService } from 'ngx-toastr';
import { UiDialogService } from '../core/services/ui-dialog.service';

@Injectable({
  providedIn: 'root'
})
export class AppToastService {
  constructor(
    private toastr: ToastrService,
    private dialog: UiDialogService
  ) {}

  success(message: string, title = 'Listo', override?: Partial<IndividualConfig>): void {
    this.toastr.success(message, title, this.buildOptions('toast-app-success', override));
  }

  error(message: string, title = 'Error', override?: Partial<IndividualConfig>): void {
    this.toastr.error(message, title, this.buildOptions('toast-app-error', override));
  }

  warning(message: string, title = 'Atencion', override?: Partial<IndividualConfig>): void {
    this.toastr.warning(message, title, this.buildOptions('toast-app-warning', override));
  }

  info(message: string, title = 'Informacion', override?: Partial<IndividualConfig>): void {
    this.toastr.info(message, title, this.buildOptions('toast-app-info', override));
  }

  confirm(message: string, title = 'Confirmar accion'): Promise<boolean> {
    return this.dialog.confirm({
      title,
      text: message,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      tone: 'primary',
      icon: 'question'
    });
  }

  private buildOptions(toastClass: string, override?: Partial<IndividualConfig>): Partial<IndividualConfig> {
    return {
      progressBar: true,
      closeButton: true,
      toastClass: `ngx-toastr ${toastClass}`,
      ...override
    };
  }
}
