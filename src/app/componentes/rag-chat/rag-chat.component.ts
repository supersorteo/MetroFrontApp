import { Component, OnInit, OnDestroy, signal, computed, NgZone, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RagUnificadoService, RagUnificadoResponse } from '../../servicios/rag-unificado.service';

interface Mensaje {
  rol: 'usuario' | 'asistente';
  texto: string;
  cargando?: boolean;
}

@Component({
  selector: 'app-rag-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rag-chat.component.html',
  styleUrl: './rag-chat.component.scss'
})
export class RagChatComponent implements OnInit, OnDestroy {
  readonly userCode = (localStorage.getItem('userCode') || '').trim();

  visible = signal(localStorage.getItem('archi-visible') !== 'false');

  private readonly SHOW_SEQ = ['a', 'r', 'c', 'h', 'i'];
  private showKeyBuf: string[] = [];
  private showKeyTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly FAB_SIZE   = 52;
  private readonly MARGIN     = 16;
  private readonly PANEL_W    = 420;
  private readonly PANEL_H    = 480;
  private readonly STORAGE_KEY = 'rag-fab-pos-premium-anchor';
  private readonly VERSION_BANNER_KEY = 'metroPreviousVersionBannerDismissed';
  private readonly DEMO_BUBBLE_DELAY = 6000;

  fabPos     = signal({ x: 0, y: 0 });
  abierto    = signal(false);
  isDragging = signal(false);
  mensajes   = signal<Mensaje[]>([]);
  preguntaActual = signal('');
  cargando   = signal(false);
  showPreviousVersionBubble = signal(false);
  previousVersionDontShowAgain = signal(
    localStorage.getItem(this.VERSION_BANNER_KEY) === 'true'
  );

  private previousVersionBubbleTimer: ReturnType<typeof setTimeout> | null = null;

  panelStyle = computed(() => {
    const { x, y } = this.fabPos();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 10;
    const pw  = Math.min(this.PANEL_W, vw - this.MARGIN * 2);

    let left = x + this.FAB_SIZE > vw / 2
      ? x - pw + this.FAB_SIZE
      : x;
    left = Math.max(this.MARGIN, Math.min(left, vw - pw - this.MARGIN));

    let top = y + this.FAB_SIZE + gap + this.PANEL_H > vh
      ? y - gap - this.PANEL_H
      : y + this.FAB_SIZE + gap;
    top = Math.max(this.MARGIN, Math.min(top, vh - this.PANEL_H - this.MARGIN));

    return { left: `${left}px`, top: `${top}px`, width: `${pw}px` };
  });

  versionBubbleStyle = computed(() => {
    const { x, y } = this.fabPos();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bubbleWidth = Math.min(300, vw - this.MARGIN * 2);
    const bubbleHeight = 154;
    const left = Math.max(
      this.MARGIN,
      Math.min(x + this.FAB_SIZE - bubbleWidth, vw - bubbleWidth - this.MARGIN)
    );
    const top = y > 170
      ? Math.max(this.MARGIN, y - bubbleHeight - 12)
      : Math.min(vh - bubbleHeight - this.MARGIN, y + this.FAB_SIZE + 12);

    return { left: `${left}px`, top: `${top}px` };
  });

  private dragMouse  = { x: 0, y: 0 };
  private dragFab    = { x: 0, y: 0 };
  private moved      = false;

  private boundMM  = this.onMM.bind(this);
  private boundMU  = this.onMU.bind(this);
  private boundTM  = this.onTM.bind(this);
  private boundTE  = this.onTE.bind(this);

  constructor(private ragService: RagUnificadoService, private zone: NgZone) {}

  ngOnInit(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      const pos   = saved ? JSON.parse(saved) : null;
      this.fabPos.set(pos ? this.clamped(pos.x, pos.y) : this.defaultPos());
    } catch {
      this.fabPos.set(this.defaultPos());
    }

    if (this.isDemoMode()) {
      this.schedulePreviousVersionBubble();
    }
  }

  ngOnDestroy(): void {
    this.removeDrag();
    if (this.previousVersionBubbleTimer) {
      clearTimeout(this.previousVersionBubbleTimer);
    }
  }

  @HostListener('window:metro-demo-entered')
  onDemoEntered(): void {
    this.schedulePreviousVersionBubble();
  }

  private isDemoMode(): boolean {
    return localStorage.getItem('trialMode') === 'true';
  }

  private schedulePreviousVersionBubble(): void {
    if (this.previousVersionBubbleTimer) {
      clearTimeout(this.previousVersionBubbleTimer);
      this.previousVersionBubbleTimer = null;
    }

    if (
      !this.isDemoMode() ||
      localStorage.getItem(this.VERSION_BANNER_KEY) === 'true'
    ) {
      return;
    }

    this.previousVersionBubbleTimer = setTimeout(() => {
      this.zone.run(() => {
        if (this.visible() && this.isDemoMode()) {
          this.showPreviousVersionBubble.set(true);
        }
      });
    }, this.DEMO_BUBBLE_DELAY);
  }

  closePreviousVersionBubble(): void {
    if (this.previousVersionDontShowAgain()) {
      localStorage.setItem(this.VERSION_BANNER_KEY, 'true');
    }
    this.showPreviousVersionBubble.set(false);
  }

  onPreviousVersionDontShowAgainChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.previousVersionDontShowAgain.set(input.checked);
  }

  @HostListener('document:keydown', ['$event'])
  onArchiKey(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement).tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    const key = event.key.toLowerCase();
    this.showKeyBuf.push(key);
    if (this.showKeyBuf.length > this.SHOW_SEQ.length) this.showKeyBuf.shift();

    if (this.showKeyTimer) clearTimeout(this.showKeyTimer);
    this.showKeyTimer = setTimeout(() => { this.showKeyBuf = []; }, 2500);

    if (this.showKeyBuf.join('') === this.SHOW_SEQ.join('')) {
      this.showKeyBuf = [];
      this.visible.update(v => !v);
      localStorage.setItem('archi-visible', String(this.visible()));
      if (this.visible()) this.abierto.set(false);
    }
  }

  ocultar(): void {
    this.abierto.set(false);
    this.visible.set(false);
    localStorage.setItem('archi-visible', 'false');
  }

  private defaultPos() {
    const premiumLeft = Math.max(this.MARGIN, window.innerWidth / 2 - 280);
    const premiumBottom = 86;
    const premiumHeight = 42;
    const gap = 10;

    return this.clamped(
      premiumLeft,
      window.innerHeight - premiumBottom - premiumHeight - gap - this.FAB_SIZE
    );
  }

  private clamped(x: number, y: number) {
    return {
      x: Math.max(this.MARGIN, Math.min(x, window.innerWidth  - this.FAB_SIZE - this.MARGIN)),
      y: Math.max(this.MARGIN, Math.min(y, window.innerHeight - this.FAB_SIZE - this.MARGIN))
    };
  }

  onFabDown(e: MouseEvent | TouchEvent): void {
    e.preventDefault();
    const p = 'touches' in e ? e.touches[0] : e;
    this.dragMouse = { x: p.clientX, y: p.clientY };
    this.dragFab   = { ...this.fabPos() };
    this.moved     = false;

    if ('touches' in e) {
      document.addEventListener('touchmove', this.boundTM, { passive: false });
      document.addEventListener('touchend',  this.boundTE);
    } else {
      document.addEventListener('mousemove', this.boundMM);
      document.addEventListener('mouseup',   this.boundMU);
    }
  }

  private onMM(e: MouseEvent) { this.zone.run(() => this.move(e.clientX, e.clientY)); }
  private onTM(e: TouchEvent) { e.preventDefault(); this.zone.run(() => this.move(e.touches[0].clientX, e.touches[0].clientY)); }

  private move(cx: number, cy: number): void {
    const dx = cx - this.dragMouse.x;
    const dy = cy - this.dragMouse.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      this.moved = true;
      this.isDragging.set(true);
    }
    if (this.moved) {
      this.fabPos.set(this.clamped(this.dragFab.x + dx, this.dragFab.y + dy));
    }
  }

  private onMU() { this.zone.run(() => this.end()); this.removeDrag(); }
  private onTE() { this.zone.run(() => this.end()); this.removeDrag(); }

  private end(): void {
    this.isDragging.set(false);
    if (!this.moved) {
      this.toggle();
    } else {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.fabPos()));
    }
  }

  private removeDrag(): void {
    document.removeEventListener('mousemove', this.boundMM);
    document.removeEventListener('mouseup',   this.boundMU);
    document.removeEventListener('touchmove', this.boundTM);
    document.removeEventListener('touchend',  this.boundTE);
  }

  toggle(): void {
    this.abierto.update(v => !v);
    if (this.abierto() && this.mensajes().length === 0) {
      this.mensajes.set([{
        rol: 'asistente',
        texto: '¡Hola! Soy Archi, tu asistente de MetroApp. 🏗️\nPuedo calcular materiales de obra o responder cualquier duda sobre la app.\nEj: "¿Cuánto cemento para 50m² de revoque exterior?" o "¿Qué incluye el plan VIP3?"'
      }]);
    }
  }

  cerrar(): void { this.abierto.set(false); }

  enviar(): void {
    const pregunta = this.preguntaActual().trim();
    if (!pregunta || this.cargando()) return;

    this.mensajes.update(msgs => [...msgs, { rol: 'usuario', texto: pregunta }]);
    this.preguntaActual.set('');
    this.cargando.set(true);
    this.mensajes.update(msgs => [...msgs, { rol: 'asistente', texto: '', cargando: true }]);

    this.ragService.consultar(pregunta, this.userCode).subscribe({
      next: (res: RagUnificadoResponse) => {
        this.mensajes.update(msgs => {
          const c = [...msgs];
          c[c.length - 1] = { rol: 'asistente', texto: res.respuesta, cargando: false };
          return c;
        });
        this.cargando.set(false);
      },
      error: () => {
        this.mensajes.update(msgs => {
          const c = [...msgs];
          c[c.length - 1] = { rol: 'asistente', texto: 'No se pudo conectar con el asistente. Revisá tu conexión.', cargando: false };
          return c;
        });
        this.cargando.set(false);
      }
    });
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.enviar(); }
  }
}
