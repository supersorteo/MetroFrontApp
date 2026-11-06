# Migración de assets a Cloudinary — Fase 3

## Contexto

Las imágenes pesadas (~18 MB) ya fueron subidas a Cloudinary en `metroapp-assets/`. El objetivo es:
1. Actualizar los componentes para que usen las URLs de Cloudinary (con `f_auto,q_auto`)
2. Mover las imágenes de `src/assets/` a una carpeta fuera del build (`promo-assets/`) para conservarlas en el proyecto sin que Firebase las sirva ni el Service Worker las cachee
3. Build + deploy en un solo paso para que producción nunca quede rota

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/app/componentes/login/login.component.html` | 3 URLs locales → Cloudinary |
| `src/app/componentes/dashboard/dashboard.component.html` | 4 URLs locales → Cloudinary |
| `src/app/componentes/membership-modal/membership-modal.component.ts` | 5 rutas en array → Cloudinary |
| `src/app/componentes/datos-de-tareas/datos-de-tareas.component.html` | 1 URL → Cloudinary |
| `src/app/componentes/terminos-condiciones/terminos-condiciones.component.html` | 1 URL → Cloudinary |
| `src/app/componentes/payment-result/payment-result.component.html` | 1 URL → Cloudinary |

---

## URLs de Cloudinary a usar

Base: `https://res.cloudinary.com/drd37bhg0/image/upload/f_auto,q_auto/metroapp-assets/`

| Imagen actual | URL Cloudinary |
|--------------|----------------|
| `assets/archi-ya-soy-miembro-v2.png` | `.../metroapp-assets/archi-ya-soy-miembro-v2` |
| `assets/archi-probar-sistema-v2.png` | `.../metroapp-assets/archi-probar-sistema-v2` |
| `assets/archi-relajado-sprite.png` | `.../metroapp-assets/archi-relajado-sprite` |
| `assets/empty-state-casco-metro-cinta.png` | `.../metroapp-assets/empty-state-casco-metro-cinta` |
| `assets/icons/metro-logo-transparent.png` | `.../metroapp-assets/metro-logo-transparent` |
| `assets/icons/empresa-add.png` | `.../metroapp-assets/empresa-add` |
| `assets/benefits/clients-companies-sprite.png` | `.../metroapp-assets/benefits/clients-companies-sprite` |
| `assets/benefits/saved-budgets-sprite.png` | `.../metroapp-assets/benefits/saved-budgets-sprite` |
| `assets/benefits/materials-calculator-sprite-v2.png` | `.../metroapp-assets/benefits/materials-calculator-sprite-v2` |
| `assets/benefits/unlimited-tasks-sprite.png` | `.../metroapp-assets/benefits/unlimited-tasks-sprite` |
| `assets/benefits/regional-prices-sprite.png` | `.../metroapp-assets/benefits/regional-prices-sprite` |

---

## Secuencia de ejecución

### 1. Actualizar los 6 componentes con URLs de Cloudinary
Reemplazar cada `src="assets/..."` o ruta en TS por la URL de Cloudinary correspondiente.

### 2. Mover las 11 imágenes a `promo-assets/`
Crear `MetroFrontApp/promo-assets/` (fuera de `src/`) y mover los archivos allí.
Esta carpeta no está en `angular.json` → no entra en el build → Firebase no la sirve → SW no la cachea.

```
MetroFrontApp/promo-assets/
  ├── archi-ya-soy-miembro-v2.png
  ├── archi-probar-sistema-v2.png
  ├── archi-relajado-sprite.png
  ├── empty-state-casco-metro-cinta.png
  ├── metro-logo-transparent.png
  ├── empresa-add.png
  └── benefits/
       ├── clients-companies-sprite.png
       ├── saved-budgets-sprite.png
       ├── materials-calculator-sprite-v2.png
       ├── unlimited-tasks-sprite.png
       └── regional-prices-sprite.png
```

### 3. Build + deploy
```bash
npm run build -- --configuration production
firebase deploy --only hosting
```

---

## Seguridad ante fallo

Si alguna imagen no carga (nombre incorrecto en Cloudinary), se puede revertir cambiando la URL de vuelta a `assets/...`. Las originales siguen en `promo-assets/` y se restauran en minutos.

---

## Verificación post-deploy

1. Abrir la app en producción → todas las imágenes deben cargar desde `res.cloudinary.com`
2. DevTools → Network → imágenes: ninguna debe venir de `metroapp-1c409.web.app`
3. DevTools → Application → Cache Storage: las 11 imágenes ya NO deben aparecer
4. Firebase Console → Hosting → Usage: bandwidth baja la próxima semana
