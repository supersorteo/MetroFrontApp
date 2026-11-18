# Análisis: Cloudflare Pages como alternativa a Firebase Hosting

## Contexto

Firebase Hosting (plan gratuito Spark) tiene un límite de **10 GB de almacenamiento** y el proyecto ya está en ~8 GB. Se necesita evaluar si Cloudflare Pages es viable como respaldo o reemplazo, dados los requerimientos técnicos del frontend.

---

## Requisitos técnicos del frontend (relevantes para el hosting)

| Requisito | Detalle |
|---|---|
| Framework | Angular 17, builder `application` |
| Output dir | `dist/pruebaw/browser/` |
| Routing | PathLocationStrategy — necesita rewrite `** → index.html` |
| Service Worker | Activo en producción (`@angular/service-worker` 17.3) |
| Cache headers | JS/CSS: `max-age=31536000, immutable`; `ngsw.json`: `no-cache` |
| Assets | Imágenes servidas desde Cloudinary (no desde el hosting) |
| Dependencia de servidor | Ninguna — SPA pura, solo archivos estáticos |

---

## ¿Es técnicamente viable en Cloudflare Pages?

**Sí, es 100% viable.** Angular 17 SPA con PWA corre perfectamente en Cloudflare Pages. Los únicos cambios necesarios son dos archivos nuevos en `src/`:

**`src/_redirects`** (SPA routing):
```
/* /index.html 200
```

**`src/_headers`** (cache headers, equivalente a `firebase.json`):
```
/**.js
  Cache-Control: max-age=31536000, immutable
/**.css
  Cache-Control: max-age=31536000, immutable
/**.woff2
  Cache-Control: max-age=31536000, immutable
/ngsw.json
  Cache-Control: no-cache, no-store, must-revalidate
/*.webmanifest
  Cache-Control: no-cache
```

Ambos archivos deben agregarse al array `assets` en `angular.json` para que el builder los copie a `dist/pruebaw/browser/` automáticamente.

El **Service Worker de Angular** no requiere nada especial del servidor — es un archivo estático (`ngsw-worker.js`) que el browser descarga del mismo origen. Cloudflare Pages lo sirve igual que cualquier otro archivo.

---

## Comparativa Firebase Hosting vs Cloudflare Pages

| Aspecto | Firebase Hosting (Spark) | Cloudflare Pages |
|---|---|---|
| **Almacenamiento gratuito** | 10 GB ⚠️ (ya en 8 GB) | **Ilimitado** ✅ |
| **Ancho de banda gratuito** | 360 MB/día | **Ilimitado** ✅ |
| **CDN PoPs** | ~30 (Google) | **300+** (Cloudflare) |
| **SPA routing** | `firebase.json` rewrites | Archivo `_redirects` |
| **Cache headers custom** | `firebase.json` headers | Archivo `_headers` |
| **Service Worker / PWA** | ✅ | ✅ |
| **Angular 17 soporte** | ✅ | ✅ |
| **Deploy desde CLI** | `firebase deploy` | `wrangler pages deploy` |
| **Deploy desde GitHub** | ✅ (con GitHub Actions) | ✅ nativo en dashboard |
| **Preview por rama** | ❌ (channel deploys manuales) | ✅ automático |
| **Dominio custom + SSL** | ✅ gratuito | ✅ gratuito |
| **Latencia en Argentina** | Buena (PoP São Paulo) | Mejor (PoP Buenos Aires) |
| **Tiempo de setup adicional** | 0 (ya configurado) | ~15 min |
| **CLI tool** | `firebase-tools` (ya instalado) | `wrangler` (instalar) |

---

## Veredicto

**Cloudflare Pages es superior en casi todos los aspectos relevantes** para este caso de uso (SPA pura, sin SSR, sin Cloud Functions). El límite de almacenamiento de Firebase es el motivo principal para migrar, y Cloudflare Pages lo resuelve completamente.

**Estrategia recomendada:**
1. Mantener Firebase Hosting activo (ya funciona, cero costo de migración)
2. Agregar Cloudflare Pages como espejo inmediato — mismo build, dos destinos
3. Cuando Firebase llegue a 10 GB, apuntar el dominio `metroapp.site` a Cloudflare Pages y deshabilitar Firebase

Esto da **cero downtime** en el momento del switch porque Cloudflare Pages ya estará corriendo y probado.

---

## Implementación aplicada

### Archivos creados

- `src/_redirects` — rewrite SPA para Cloudflare Pages
- `src/_headers` — cache headers equivalentes a `firebase.json`
- `angular.json` — modificado para copiar ambos archivos al output del build

### Setup en Cloudflare Pages (manual, una sola vez)

**Opción A — Conectar GitHub (recomendado, deploys automáticos):**
1. Ir a https://pages.cloudflare.com → Create a project → Connect to Git
2. Repositorio: `MetroFrontApp`, Branch: `RAMA27/09`
3. Build command: `npm run build`
4. Build output directory: `dist/pruebaw/browser`
5. Environment variables: ninguna necesaria

**Opción B — Deploy manual (igual que Firebase):**
```bash
npm install -g wrangler
wrangler login
npm run build
wrangler pages deploy dist/pruebaw/browser --project-name metroapp
```

### Verificación post-deploy

- [ ] SPA routing: navegar a `/dashboard` directo (sin pasar por `/`) → no debe dar 404
- [ ] Service Worker: DevTools → Application → Service Workers → activo
- [ ] Cache headers: DevTools → Network → cualquier `.js` → `Cache-Control: max-age=31536000, immutable`
- [ ] `ngsw.json` con `no-cache`: Network → `ngsw.json` → Response Headers
- [ ] Lazy routes: `/presupuesto`, `/calculadora` cargan sin error
- [ ] Auth guards: `/dashboard` sin login → redirige a `/login`
