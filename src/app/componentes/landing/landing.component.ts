import { AfterViewInit, Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { SeoService } from '../../core/services/seo.service';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, AssetUrlPipe],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  private doc = inject(DOCUMENT);
  private scrollObserver?: IntersectionObserver;
  sidebarOpen = false;

  constructor(private seo: SeoService) {}

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar(): void { this.sidebarOpen = false; }

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Metro Argentina | Presupuestos de obra simples y profesionales',
      description: 'Software argentino para presupuestos de obra, calcular materiales y organizar clientes. Probalo gratis desde cualquier dispositivo.',
      url: 'https://metroapp.site/'
    });
    this.injectFonts();
    this.injectSchemas();
  }

  ngAfterViewInit(): void {
    this.initScrollReveal();
  }

  ngOnDestroy(): void {
    this.scrollObserver?.disconnect();
    this.doc.querySelector('#landing-fonts')?.remove();
    this.doc.querySelector('#landing-schema-graph')?.remove();
    this.doc.querySelector('#landing-schema-faq')?.remove();
  }

  private initScrollReveal(): void {
    if (!('IntersectionObserver' in window)) {
      this.doc.querySelectorAll('.audience-inner,.faq-list,.cta-card,.mobile-photo-sprite-feature').forEach(
        el => el.classList.add('is-visible')
      );
      return;
    }
    this.scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          this.scrollObserver!.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    this.doc.querySelectorAll('.audience-inner,.faq-list,.cta-card,.mobile-photo-sprite-feature').forEach(
      el => this.scrollObserver!.observe(el)
    );
  }

  private injectFonts(): void {
    if (this.doc.querySelector('#landing-fonts')) return;
    const link = this.doc.createElement('link');
    link.id = 'landing-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap';
    this.doc.head.appendChild(link);
  }

  private injectSchemas(): void {
    this.doc.querySelector('#landing-schema-graph')?.remove();
    this.doc.querySelector('#landing-schema-faq')?.remove();

    const graph = this.doc.createElement('script');
    graph.id = 'landing-schema-graph';
    graph.type = 'application/ld+json';
    graph.text = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://metroapp.site/#organization",
          "name": "Metro",
          "url": "https://metroapp.site/",
          "logo": "https://metroapp.site/assets/landing/metro-logo.png",
          "areaServed": { "@type": "Country", "name": "Argentina" },
          "description": "Software argentino para presupuestos y organización de obras."
        },
        {
          "@type": "WebSite",
          "@id": "https://metroapp.site/#website",
          "url": "https://metroapp.site/",
          "name": "Metro",
          "inLanguage": "es-AR",
          "publisher": { "@id": "https://metroapp.site/#organization" }
        },
        {
          "@type": "SoftwareApplication",
          "@id": "https://metroapp.site/#software",
          "name": "Metro",
          "url": "https://metroapp.site/",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "description": "Software para crear presupuestos de obra, calcular materiales y organizar clientes en Argentina.",
          "inLanguage": "es-AR",
          "areaServed": { "@type": "Country", "name": "Argentina" },
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "ARS",
            "availability": "https://schema.org/InStock",
            "url": "https://metroapp.site/login"
          },
          "featureList": [
            "Presupuestos profesionales de obra",
            "Calculadora de materiales de construcción",
            "Organización de clientes y empresas",
            "Acceso desde computadora y celular"
          ]
        }
      ]
    });
    this.doc.head.appendChild(graph);

    const faq = this.doc.createElement('script');
    faq.id = 'landing-schema-faq';
    faq.type = 'application/ld+json';
    faq.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "¿Qué es Metro?", "acceptedAnswer": { "@type": "Answer", "text": "Metro es un software argentino para crear presupuestos de obra, calcular materiales y organizar clientes y empresas desde cualquier dispositivo." } },
        { "@type": "Question", "name": "¿Para quién está pensado?", "acceptedAnswer": { "@type": "Answer", "text": "Está pensado para albañiles, arquitectos, maestros mayores de obra, contratistas y empresas de construcción que trabajan en Argentina." } },
        { "@type": "Question", "name": "¿Puedo calcular materiales de construcción?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Metro permite consultar y calcular materiales para distintas tareas de obra con referencias adaptadas al trabajo local." } },
        { "@type": "Question", "name": "¿Necesito instalar un programa?", "acceptedAnswer": { "@type": "Answer", "text": "No. Metro funciona desde el navegador y podés acceder desde una computadora o un celular." } },
        { "@type": "Question", "name": "¿Cómo empiezo?", "acceptedAnswer": { "@type": "Answer", "text": "Ingresá a Metro, elegí la opción de prueba y comenzá a crear tu primer presupuesto." } }
      ]
    });
    this.doc.head.appendChild(faq);
  }
}
