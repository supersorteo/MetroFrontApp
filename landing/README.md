# Metro Landing

Landing estática de una sola página para desplegar en Vercel.

## Despliegue

Configurar `landing/` como **Root Directory** del proyecto en Vercel. No requiere build command: el archivo de entrada es `index.html`.

La landing incluye `robots.txt`, `sitemap.xml`, `llms.txt` y `vercel.json` para facilitar indexación, descubrimiento por agentes y cacheo de recursos.

## Dominio canónico

Antes de publicar, reemplazar `https://metroapp.site/landing` por la URL final de la landing en `index.html`, `robots.txt`, `sitemap.xml` y los bloques JSON-LD. El CTA seguirá apuntando a `https://www.metroapp.site/`.

Todos los llamados a la acción apuntan a `https://www.metroapp.site/`.

## Recursos visuales

- `assets/metro-city-cover.png`: portada ilustrada de ciudad en construcción.
- `assets/card-budgets.png`: concepto de presupuestos profesionales.
- `assets/card-materials.png`: concepto de cálculo y organización de materiales.
- `assets/card-control.png`: concepto de coordinación y control de obra.
- `assets/archi-expressions.png`: sprite de expresiones de ARCHI.
- `assets/metro-logo.png`: logo de METRO.
