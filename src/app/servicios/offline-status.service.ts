import { Injectable, OnDestroy, signal } from '@angular/core';
import { APP_API_URL } from '../core/api/api.config';

@Injectable({ providedIn: 'root' })
export class OfflineStatusService implements OnDestroy {
  // Starts as unknown — first probe resolves it
  readonly isOnline = signal<boolean>(true);

  private probeTimer: ReturnType<typeof setInterval> | null = null;
  private probing = false;

  // Browser offline event: immediate pessimistic signal while probe confirms
  private readonly handleOffline    = () => this.isOnline.set(false);
  private readonly handleOnline     = () => void this.probe();
  private readonly handleVisibility = () => { if (!document.hidden) void this.probe(); };

  constructor() {
    window.addEventListener('online',  this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    document.addEventListener('visibilitychange', this.handleVisibility);
    void this.probe();
    this.probeTimer = setInterval(() => void this.probe(), 2000);
  }

  async probe(): Promise<boolean> {
    if (this.probing) return this.isOnline();
    this.probing = true;
    try {
      // Browser explicitly offline → trust it without probing.
      // This prevents a localhost probe succeeding in dev and overriding
      // the offline event while real internet is gone.
      if (!navigator.onLine) {
        this.isOnline.set(false);
        return false;
      }
      // Browser thinks online → verify actual backend reachability.
      // ngsw-bypass prevents Angular SW from returning a cached response.
      const res = await fetch(`${APP_API_URL}/ping?_=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'ngsw-bypass': 'true' },
        signal: AbortSignal.timeout(3000)
      });
      this.isOnline.set(res.ok);
      return res.ok;
    } catch {
      // Timeout, DNS fail, connection refused → backend unreachable
      this.isOnline.set(false);
      return false;
    } finally {
      this.probing = false;
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('online',  this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    if (this.probeTimer) clearInterval(this.probeTimer);
  }
}
