import { Pipe, PipeTransform } from '@angular/core';

export function formatPrecioArgentino(value: number | string | null | undefined): string {
  const numero = Number(value);
  return Number.isFinite(numero)
    ? `$${Math.round(numero).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
    : '$0';
}

@Pipe({
  name: 'precioArgentino',
  standalone: true
})
export class PrecioArgentinoPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    return formatPrecioArgentino(value);
  }
}
