import { Injectable, OnDestroy, signal } from '@angular/core';
import { APP_API_URL } from '../core/api/api.config';

@Injectable({ providedIn: 'root' })
export class OfflineStatusService implements OnDestroy {
  readonly isOnline = signal<boolean>(navigator.onLine);

  private probeTimer: ReturnType<typeof setInterval> | null = null;

  private readonly handleOnline = () => void this.probe();
  private readonly handleOffline = () => this.isOnline.set(false);

  constructor() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    // Probe every 10s to catch cases where navigator.onLine lags reality
    this.probeTimer = setInterval(() => void this.probe(), 10000);
  }

  async probe(): Promise<boolean> {
    if (!navigator.onLine) {
      this.isOnline.set(false);
      return false;
    }
    try {
      const res = await fetch(`${APP_API_URL}/ping`, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(4000)
      });
      const online = res.ok;
      this.isOnline.set(online);
      return online;
    } catch {
      // Network error or timeout → mark offline only if browser agrees
      if (!navigator.onLine) this.isOnline.set(false);
      return false;
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    if (this.probeTimer) clearInterval(this.probeTimer);
  }
}
