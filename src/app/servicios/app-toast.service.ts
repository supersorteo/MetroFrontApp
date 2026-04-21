import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { IndividualConfig, ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class AppToastService {
  constructor(
    private toastr: ToastrService,
    @Inject(DOCUMENT) private document: Document
  ) {}

  success(message: string, title = 'Listo', override?: Partial<IndividualConfig>): void {
    this.toastr.success(message, title, this.buildOptions('toast-app-success', override));
  }

  error(message: string, title = 'Error', override?: Partial<IndividualConfig>): void {
    this.toastr.error(message, title, this.buildOptions('toast-app-error', override));
  }

  warning(message: string, title = 'Atención', override?: Partial<IndividualConfig>): void {
    this.toastr.warning(message, title, this.buildOptions('toast-app-warning', override));
  }

  info(message: string, title = 'Información', override?: Partial<IndividualConfig>): void {
    this.toastr.info(message, title, this.buildOptions('toast-app-info', override));
  }

  confirm(message: string, title = 'Confirmar acción'): Promise<boolean> {
    return new Promise(resolve => {
      const container = this.getOrCreateConfirmContainer();
      const toast = this.document.createElement('div');
      toast.className = 'app-confirm-toast';

      const header = this.document.createElement('div');
      header.className = 'app-confirm-toast__header';

      const titleNode = this.document.createElement('div');
      titleNode.className = 'app-confirm-toast__title';
      titleNode.textContent = title;

      const closeButton = this.document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'app-confirm-toast__close';
      closeButton.setAttribute('aria-label', 'Cancelar');
      closeButton.textContent = '×';

      header.appendChild(titleNode);
      header.appendChild(closeButton);

      const body = this.document.createElement('div');
      body.className = 'app-confirm-toast__body';
      body.textContent = message;

      const actions = this.document.createElement('div');
      actions.className = 'app-confirm-toast__actions';

      const cancelButton = this.document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'app-confirm-toast__button app-confirm-toast__button--cancel';
      cancelButton.textContent = 'Cancelar';

      const confirmButton = this.document.createElement('button');
      confirmButton.type = 'button';
      confirmButton.className = 'app-confirm-toast__button app-confirm-toast__button--confirm';
      confirmButton.textContent = 'Confirmar';

      actions.appendChild(cancelButton);
      actions.appendChild(confirmButton);

      toast.appendChild(header);
      toast.appendChild(body);
      toast.appendChild(actions);
      container.appendChild(toast);

      let settled = false;

      const cleanup = (value: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        confirmButton.removeEventListener('click', onConfirm);
        cancelButton.removeEventListener('click', onCancel);
        closeButton.removeEventListener('click', onCancel);
        toast.classList.add('app-confirm-toast--closing');
        window.setTimeout(() => {
          toast.remove();
          if (!container.childElementCount) {
            container.remove();
          }
          resolve(value);
        }, 180);
      };

      const onConfirm = () => cleanup(true);
      const onCancel = () => cleanup(false);

      confirmButton.addEventListener('click', onConfirm);
      cancelButton.addEventListener('click', onCancel);
      closeButton.addEventListener('click', onCancel);
    });
  }

  private getOrCreateConfirmContainer(): HTMLElement {
    const existing = this.document.getElementById('app-confirm-toast-container');
    if (existing) {
      return existing;
    }

    const container = this.document.createElement('div');
    container.id = 'app-confirm-toast-container';
    container.className = 'app-confirm-toast-container';
    this.document.body.appendChild(container);
    return container;
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
