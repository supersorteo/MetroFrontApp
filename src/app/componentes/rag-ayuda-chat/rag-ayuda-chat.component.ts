import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RagAyudaService, RagAyudaResponse } from '../../servicios/rag-ayuda.service';

interface Mensaje {
  rol: 'usuario' | 'asistente';
  texto: string;
  cargando?: boolean;
}

@Component({
  selector: 'app-rag-ayuda-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rag-ayuda-chat.component.html',
  styleUrl: './rag-ayuda-chat.component.scss'
})
export class RagAyudaChatComponent {
  readonly userCode = (localStorage.getItem('userCode') || '').trim();

  abierto = signal(false);
  mensajes = signal<Mensaje[]>([]);
  preguntaActual = signal('');
  cargando = signal(false);

  constructor(private ragService: RagAyudaService) {}

  toggle(): void {
    this.abierto.update(v => !v);
    if (this.abierto() && this.mensajes().length === 0) {
      this.mensajes.set([{
        rol: 'asistente',
        texto: '¡Hola! Soy el asistente de MetroApp. ¿En qué te puedo ayudar?\nEj: "¿Cómo activo el modo VIP?" o "¿Qué puedo hacer con la calculadora?"'
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
      next: (res: RagAyudaResponse) => {
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
