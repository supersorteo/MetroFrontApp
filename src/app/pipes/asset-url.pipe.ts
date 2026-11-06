import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../environments/environment';

@Pipe({ name: 'assetUrl', standalone: true })
export class AssetUrlPipe implements PipeTransform {
  transform(path: string): string {
    const base = environment.assetsBase;
    if (!base) return path;
    const name = path
      .replace(/^assets\//, '')
      .replace(/^icons\//, '');
    return `${base}/${name}`;
  }
}
