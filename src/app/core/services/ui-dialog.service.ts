import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2';

export type DialogTone = 'primary' | 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmDialogConfig {
  title: string;
  text?: string;
  html?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: DialogTone;
  icon?: SweetAlertIcon;
  reverseButtons?: boolean;
}

export interface MessageDialogConfig {
  title: string;
  text?: string;
  html?: string;
  buttonText?: string;
  tone?: DialogTone;
  icon?: SweetAlertIcon;
}

@Injectable({
  providedIn: 'root'
})
export class UiDialogService {
  confirm(config: ConfirmDialogConfig): Promise<boolean> {
    const options = this.buildBaseOptions(config.tone ?? 'primary', {
      title: config.title,
      text: config.text,
      html: config.html,
      icon: config.icon ?? 'question',
      showCancelButton: true,
      confirmButtonText: config.confirmText ?? 'Confirmar',
      cancelButtonText: config.cancelText ?? 'Cancelar',
      reverseButtons: config.reverseButtons ?? true,
      focusCancel: true
    });

    return Swal.fire(options).then(result => result.isConfirmed);
  }

  success(config: MessageDialogConfig): Promise<void> {
    return this.showMessageDialog(config, 'success', 'Aceptar');
  }

  error(config: MessageDialogConfig): Promise<void> {
    return this.showMessageDialog(config, 'danger', 'Entendido');
  }

  warning(config: MessageDialogConfig): Promise<void> {
    return this.showMessageDialog(config, 'warning', 'Entendido');
  }

  info(config: MessageDialogConfig): Promise<void> {
    return this.showMessageDialog(config, 'info', 'Aceptar');
  }

  confirmDelete(entityName: string, detail?: string): Promise<boolean> {
    return this.confirm({
      title: 'Eliminar elemento?',
      text: detail ?? `Se eliminara "${entityName}". Esta accion no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      tone: 'danger',
      icon: 'warning'
    });
  }

  confirmDiscardChanges(): Promise<boolean> {
    return this.confirm({
      title: 'Descartar cambios?',
      text: 'Los cambios no guardados se perderan.',
      confirmText: 'Si, salir',
      cancelText: 'Seguir editando',
      tone: 'warning',
      icon: 'warning'
    });
  }

  confirmLogout(): Promise<boolean> {
    return this.confirm({
      title: 'Cerrar sesion?',
      text: 'Tendras que volver a iniciar sesion para continuar.',
      confirmText: 'Cerrar sesion',
      cancelText: 'Cancelar',
      tone: 'primary',
      icon: 'question'
    });
  }

  private showMessageDialog(
    config: MessageDialogConfig,
    fallbackTone: DialogTone,
    fallbackButtonText: string
  ): Promise<void> {
    const options = this.buildBaseOptions(config.tone ?? fallbackTone, {
      title: config.title,
      text: config.text,
      html: config.html,
      icon: config.icon ?? this.resolveDefaultIcon(config.tone ?? fallbackTone),
      confirmButtonText: config.buttonText ?? fallbackButtonText
    });

    return Swal.fire(options).then(() => undefined);
  }

  private buildBaseOptions(tone: DialogTone, options: SweetAlertOptions): SweetAlertOptions {
    return {
      ...options,
      buttonsStyling: false,
      heightAuto: false,
      backdrop: 'rgba(10, 24, 49, 0.46)',
      customClass: {
        popup: `app-dialog-popup app-dialog--${tone}`,
        title: 'app-dialog-title',
        htmlContainer: 'app-dialog-html',
        actions: 'app-dialog-actions',
        confirmButton: 'app-dialog-confirm',
        cancelButton: 'app-dialog-cancel'
      }
    };
  }

  private resolveDefaultIcon(tone: DialogTone): SweetAlertIcon {
    switch (tone) {
      case 'danger':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'success':
        return 'success';
      default:
        return 'question';
    }
  }
}
