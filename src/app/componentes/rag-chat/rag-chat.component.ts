import { Component, signal } from '@angular/core';
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
export class RagChatComponent {
  readonly userCode = (localStorage.getItem('userCode') || '').trim();

  abierto = signal(false);
  mensajes = signal<Mensaje[]>([]);
  preguntaActual = signal('');
  cargando = signal(false);

  constructor(private ragService: RagUnificadoService) {}

  toggle(): void {
    this.abierto.update(v => !v);
    if (this.abierto() && this.mensajes().length === 0) {
      this.mensajes.set([{
        rol: 'asistente',
        texto: '¡Hola! Soy el asistente de MetroApp.\nPuedo ayudarte a calcular materiales de construcción o responder dudas sobre la app.\nEj: "¿Cuánto cemento para 50m² de revoque exterior?" o "¿Qué incluye el plan VIP3?"'
      }]);
    }
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  enviar(): void {
    const pregunta = this.preguntaActual().trim();
    if (!pregunta || this.cargando()) return;

    this.mensajes.update(msgs => [...msgs, { rol: 'usuario', texto: pregunta }]);
    this.preguntaActual.set('');
    this.cargando.set(true);

    const indicador: Mensaje = { rol: 'asistente', texto: '', cargando: true };
    this.mensajes.update(msgs => [...msgs, indicador]);

    this.ragService.consultar(pregunta, this.userCode).subscribe({
      next: (res: RagUnificadoResponse) => {
        this.mensajes.update(msgs => {
          const copia = [...msgs];
          copia[copia.length - 1] = { rol: 'asistente', texto: res.respuesta, cargando: false };
          return copia;
        });
        this.cargando.set(false);
      },
      error: () => {
        this.mensajes.update(msgs => {
          const copia = [...msgs];
          copia[copia.length - 1] = {
            rol: 'asistente',
            texto: 'No se pudo conectar con el asistente. Revisá tu conexión.',
            cargando: false
          };
          return copia;
        });
        this.cargando.set(false);
      }
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviar();
    }
  }
}
