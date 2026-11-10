# Optimización de bandwidth Firebase Hosting — MetroApp

## Diagnóstico — Causas raíz por impacto

### CAUSA 1 — CRÍTICA: `updateMode: "prefetch"` en assets del Service Worker

En `ngsw-config.json`, el grupo `assets` tiene `updateMode: "prefetch"`. Esto significa que **cada vez que se hace un nuevo deploy**, el SW de cada usuario activo detecta la nueva versión y descarga anticipadamente los 40 assets completos (~19 MB de imágenes PNG) aunque no hayan cambiado.

**Matemática:** 50 usuarios × 5 deploys × ~10 MB gzipped = **2.5 GB por ciclo de desarrollo**.

### CAUSA 2 — ALTA: 18 MB de imágenes PNG sin optimizar en Firebase Hosting

Los assets incluyen 10 imágenes PNG de 1.2–2.4 MB cada una (sprites de "archi-" y "benefits/"). Se sirven directamente desde Firebase sin compresión. Siendo que el proyecto **ya usa Cloudinary**, estas imágenes deberían estar ahí con `f_auto,q_auto` que las reduciría al 10–15% de su tamaño.

### CAUSA 3 — MEDIA: Sin headers de caché en `firebase.json`

Los archivos JS/CSS hasheados tienen solo `max-age=3600` (1 hora) por defecto. Deberían tener `max-age=31536000, immutable` ya que el hash en el nombre garantiza que son inmutables.

### CAUSA 4 — MENOR: `html2pdf.js` (1.1 MB) bundleado globalmente

Se carga para todos los usuarios aunque solo los que generan PDFs lo necesiten.

---

## Plan de implementación (3 fases)

### FASE 1 — Fix inmediato del Service Worker (impacto ~70% reducción)

**Archivo:** `ngsw-config.json`

Cambiar el grupo `assets` de `updateMode: "prefetch"` a `updateMode: "lazy"`.

Con `lazy`: los assets solo se descargan cuando el usuario visita la parte de la app que los necesita. En updates NO se reprefetchean todos automáticamente.

---

### FASE 2 — Headers de caché en firebase.json (impacto ~20% reducción)

**Archivo:** `firebase.json`

Agregar sección `headers`:
- JS/CSS hasheados → `max-age=31536000, immutable` (1 año, son inmutables por el hash)
- `ngsw.json` → `no-cache` (para que el SW detecte updates)
- Imágenes → `max-age=604800` (7 días)

---

### FASE 3 — Migrar imágenes PNG a Cloudinary (impacto ~85% en peso de imágenes)

Los 10 archivos PNG más pesados (~15 MB en total) deben subirse a Cloudinary y reemplazarse en los componentes. Con `f_auto,q_auto` Cloudinary los serviría como WebP/AVIF a 150–300 KB c/u.

**Archivos a migrar (en orden de impacto):**
1. `archi-ya-soy-miembro-v2.png` (2.4 MB)
2. `archi-probar-sistema-v2.png` (1.8 MB)
3. `archi-relajado-sprite.png` (1.6 MB)
4. `empty-state-casco-metro-cinta.png` (1.5 MB)
5. `benefits/clients-companies-sprite.png` (1.4 MB)
6. `benefits/saved-budgets-sprite.png` (1.3 MB)
7. `benefits/materials-calculator-sprite.png` (1.3 MB)
8. `benefits/unlimited-tasks-sprite.png` (1.3 MB)
9. `benefits/regional-prices-sprite.png` (1.3 MB)
10. `metro-logo-transparent.png` (919 KB) → reemplazar por SVG

Una vez migrados, removerlos de `src/assets/` y del `ngsw-config.json`.

---

## Impacto esperado combinado

| Acción | Reducción estimada |
|--------|-------------------|
| Fix SW updateMode (Fase 1) | ~70% del consumo actual |
| Headers de caché (Fase 2) | ~15–20% adicional |
| Migrar imágenes a Cloudinary (Fase 3) | ~85% del peso de assets |
| **Resultado proyectado** | **~1–2 GB/mes en lugar de 12–15 GB** |

---

## Verificación post-deploy

1. Firebase Console → Hosting → Usage → Bandwidth: comparar semana a semana
2. DevTools → Network tab: verificar que assets no se descargan en segundo plano
3. DevTools → Application → Cache Storage: verificar que solo cachea lo visitado
4. Lighthouse: confirmar que PWA sigue instalable correctamente
