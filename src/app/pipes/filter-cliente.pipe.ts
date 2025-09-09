import { Pipe, PipeTransform } from '@angular/core';
import { Cliente } from '../servicios/cliente.service';

@Pipe({
  name: 'filterCliente',
  standalone: true
})
export class FilterClientePipe implements PipeTransform {
  transform(clientes: Cliente[], filtro: string): Cliente[] {
    if (!filtro || !clientes) return clientes;
    const lowerFiltro = filtro.toLowerCase();
    return clientes.filter(cliente =>
      Object.values(cliente).some(val =>
        val && val.toString().toLowerCase().includes(lowerFiltro)
      )
    );
  }
}
