# Mover imágenes sin uso fuera del build de Angular

## Contexto

Hay imágenes en `src/assets/` que no están referenciadas en ningún componente, template ni stylesheet de la app. Aunque no generan bandwidth activo, Angular las copia al build y Firebase las despliega, aumentando el peso del deploy y el tiempo de procesamiento del Service Worker. Se deben mover a `promo-assets/` (carpeta fuera del build) para mantenerlas en el proyecto sin que Firebase las sirva.

## Imágenes a mover — candidatos seguros

| Archivo | Ruta actual | Tamaño | Motivo |
|---|---|---|---|
| `archi-probar-sistema.webp` | `src/assets/` | 232 KB | Versión obsoleta — reemplazada por v2 |
| `archi-quiero-unirme.webp` | `src/assets/` | 275 KB | Sin ninguna referencia |
| `archi-ya-soy-miembro.webp` | `src/assets/` | 264 KB | Versión obsoleta — reemplazada por v2 |
| `benefits/materials-calculator-sprite.png` | `src/assets/benefits/` | 1.3 MB | Versión v1 obsoleta — reemplazada por v2 |
| `icons/icon-72x72.png` | `src/assets/icons/` | 1.9 KB | Sin referencias |
| `icons/icon-128x128.png` | `src/assets/icons/` | 2.8 KB | Sin referencias |
| `icons/icon-144x144.png` | `src/assets/icons/` | 3.0 KB | Sin referencias |
| `icons/icon-152x152.png` | `src/assets/icons/` | 3.2 KB | Sin referencias |
| `icons/icon-384x384.png` | `src/assets/icons/` | 10.8 KB | Sin referencias |

**Total a mover: ~2.4 MB**

## Imágenes que NO se deben tocar

| Archivo | Motivo |
|---|---|
| `icons/icon-96x96.png` | Referenciada en `manifest.webmanifest` (PWA) |
| `icons/icon-192x192.png` | Referenciada en `manifest.webmanifest` (PWA) |
| `icons/icon-512x512.png` | Referenciada en `manifest.webmanifest` (PWA) |

Todas las demás imágenes en `src/assets/` están en uso activo en componentes.

## Plan de ejecución

### 1. Crear carpeta destino
```
MetroFrontApp/promo-assets/
MetroFrontApp/promo-assets/benefits/
MetroFrontApp/promo-assets/icons/
```

### 2. Mover archivos con PowerShell
```powershell
Move-Item src/assets/archi-probar-sistema.webp promo-assets/
Move-Item src/assets/archi-quiero-unirme.webp promo-assets/
Move-Item src/assets/archi-ya-soy-miembro.webp promo-assets/
Move-Item src/assets/benefits/materials-calculator-sprite.png promo-assets/benefits/
Move-Item src/assets/icons/icon-72x72.png promo-assets/icons/
Move-Item src/assets/icons/icon-128x128.png promo-assets/icons/
Move-Item src/assets/icons/icon-144x144.png promo-assets/icons/
Move-Item src/assets/icons/icon-152x152.png promo-assets/icons/
Move-Item src/assets/icons/icon-384x384.png promo-assets/icons/
```

### 3. Verificar
- Confirmar que `src/assets/` ya no contiene esos archivos
- Confirmar que `promo-assets/` los tiene
- Correr `ng serve` para asegurar que no hay errores de compilación ni imágenes rotas

## Verificación

1. `ng serve` sin errores — ningún componente referenciaba esas imágenes, así que no debe romperse nada
2. Abrir la app en local → verificar que todas las pantallas cargan correctamente
3. Revisar `dist/` tras un build para confirmar que esas imágenes ya no están en el output
