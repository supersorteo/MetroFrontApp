import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-floating-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './floating-button.component.html',
  styleUrl: './floating-button.component.scss'
})
export class FloatingButtonComponent {
  @Input() fechaVencimiento: string = ''; remainingTime: string = '';

  ngOnInit(): void {
    this.updateRemainingTime(); setInterval(() => { this.updateRemainingTime(); }, 60000);
  }

  updateRemainingTime(): void { this.remainingTime = this.calculateRemainingTime(this.fechaVencimiento); }

  calculateRemainingTime(fechaVencimiento: string): string { if (!fechaVencimiento) { return 'Fecha de vencimiento no disponible'; }

  const now = new Date(); const expiryDate = new Date(fechaVencimiento); if (isNaN(expiryDate.getTime())) { return 'Fecha inválida'; } const timeDiff = expiryDate.getTime() - now.getTime(); const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)); return daysDiff > 0 ? `${daysDiff} días restantes` : 'Código expirado';
}
}
