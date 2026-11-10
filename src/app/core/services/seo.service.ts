import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface SeoPageConfig {
  title: string;
  description: string;
  url?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private doc = inject(DOCUMENT);

  constructor(private meta: Meta, private title: Title) {}

  setPage(config: SeoPageConfig): void {
    this.title.setTitle(config.title);
    this.meta.updateTag({ name: 'description', content: config.description });
    this.meta.updateTag({ property: 'og:title', content: config.title });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    if (config.url) {
      this.meta.updateTag({ property: 'og:url', content: config.url });
      const existing = this.doc.querySelector('link[rel="canonical"]');
      if (existing) {
        existing.setAttribute('href', config.url);
      } else {
        const link = this.doc.createElement('link');
        link.setAttribute('rel', 'canonical');
        link.setAttribute('href', config.url);
        this.doc.head.appendChild(link);
      }
    }
  }
}
