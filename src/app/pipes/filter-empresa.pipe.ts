import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterEmpresa',
  standalone: true
})
export class FilterEmpresaPipe implements PipeTransform {
  transform(empresas: any[], filtro: string): any[] {
    if (!empresas) return [];
    if (!filtro || filtro.trim() === '') return empresas;
    const lowerFiltro = filtro.toLowerCase();
    return empresas.filter(empresa =>
      empresa.name?.toLowerCase().includes(lowerFiltro) ||
      empresa.email?.toLowerCase().includes(lowerFiltro) ||
      empresa.phone?.toLowerCase().includes(lowerFiltro) ||
      empresa.description?.toLowerCase().includes(lowerFiltro)
    );
  }
}
