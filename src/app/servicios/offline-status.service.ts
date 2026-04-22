import { Injectable, OnDestroy, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OfflineStatusService implements OnDestroy {
  readonly isOnline = signal<boolean>(navigator.onLine);

  private readonly handleOnline = () => this.isOnline.set(true);
  private readonly handleOffline = () => this.isOnline.set(false);

  constructor() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}
