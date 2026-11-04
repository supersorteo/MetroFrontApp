# Validación Teléfono Argentina — Código de Área ENACOM

## Contexto

La validación actual de Argentina (`diagnoseAR`) solo verifica:
- No `0` inicial
- No `15` inicial
- No patrón `XX15XXXXX`
- Exactamente 10 dígitos

No valida si el código de área existe realmente. Esto permite que un número como `9912345678` pase sin error aunque el código `99` no existe en Argentina.

**Mejora:** usar los 300 códigos oficiales de ENACOM (compilados en `metro_caracteristicas_telefonicas_argentina.json`, 2026-11-03) para verificar que los primeros 2, 3 ó 4 dígitos del número pertenezcan a una característica real. La validación es **independiente de la provincia**: el JSON mismo dice *"la numeración puede conservarse al cambiar de residencia"* — validamos existencia del código, no que coincida con la ubicación del usuario.

---

## Archivo a modificar

**Único archivo:** `MetroFrontApp/src/app/core/utils/phone-validation.util.ts`

No se toca ningún componente, HTML ni otro servicio. La lógica mejorada queda encapsulada en el util.

---

## Implementación

### Paso 1 — Agregar los 300 códigos ENACOM como Sets

Agregar tres constantes antes de la función `diagnoseAR`:

```typescript
// ─── Códigos de área Argentina (ENACOM, 300 códigos, fuente 2026-11-03) ────────
const AR_AREA_CODES_2 = new Set(['11']);

const AR_AREA_CODES_3 = new Set([
  // Buenos Aires
  '220','221','223','230','236','237','249','291','336','348',
  // Catamarca
  '383',
  // Chaco
  '362','364',
  // Chubut
  '280','297',
  // Córdoba
  '351','353','358',
  // Corrientes
  '379',
  // Entre Ríos
  '343','345',
  // Formosa
  '370',
  // Jujuy
  '388',
  // La Rioja
  '380',
  // Mendoza
  '260','261','263',
  // Misiones
  '376',
  // Neuquén
  '299',
  // Río Negro
  '294','298',
  // Salta
  '387',
  // San Juan
  '264',
  // San Luis
  '266',
  // Santa Fe
  '341','342',
  // Santiago del Estero
  '385',
  // Tucumán
  '381',
]);

const AR_AREA_CODES_4 = new Set([
  // Buenos Aires
  '2202','2221','2223','2224','2225','2226','2227','2229',
  '2241','2242','2243','2244','2245','2246','2252','2254','2255','2257',
  '2261','2262','2264','2265','2266','2267','2268','2271','2272','2273','2274',
  '2281','2283','2284','2285','2286','2291','2292','2296','2297',
  '2314','2316','2317','2320','2323','2324','2325','2326','2337',
  '2342','2343','2344','2345','2346','2352','2353','2354','2355','2356','2357','2358',
  '2392','2393','2394','2395','2396','2473','2474','2475','2477','2478',
  '2921','2922','2923','2924','2925','2926','2927','2928','2929',
  '2932','2933','2935','2936','2982','2983',
  '3327','3329','3388','3407','3487','3489',
  // Catamarca
  '3832','3835','3837','3838',
  // Chaco
  '3721','3725','3731','3734','3735',
  // Chubut
  '2903','2945',
  // Córdoba
  '2336','3385','3387','3463','3467','3468','3472',
  '3521','3522','3524','3525','3532','3533','3537',
  '3541','3542','3543','3544','3546','3547','3548','3549',
  '3562','3563','3564','3571','3572','3573','3574','3575','3576',
  '3582','3583','3584','3585',
  // Corrientes
  '3756','3772','3773','3774','3775','3777','3781','3782','3786',
  // Entre Ríos
  '3435','3436','3437','3438','3442','3444','3445','3446','3447',
  '3454','3455','3456','3458',
  // Formosa
  '3711','3715','3716','3718',
  // Jujuy
  '3885','3886','3887','3888',
  // La Pampa
  '2302','2331','2333','2334','2335','2338','2952','2953','2954',
  // La Rioja
  '3821','3825','3826','3827',
  // Mendoza
  '2622','2624','2625','2626',
  // Misiones
  '3741','3743','3751','3754','3755','3757','3758',
  // Neuquén
  '2942','2948','2972',
  // Río Negro
  '2920','2931','2934','2940','2946',
  // Salta
  '3868','3873','3876','3877','3878',
  // San Juan
  '2646','2647','2648',
  // San Luis
  '2651','2655','2656','2657','2658',
  // Santa Cruz
  '2902','2962','2963','2966',
  // Santa Fe
  '3382','3400','3401','3402','3404','3405','3406','3408','3409',
  '3460','3462','3464','3465','3466','3469','3471','3476',
  '3482','3483','3491','3492','3493','3496','3497','3498',
  // Santiago del Estero
  '3841','3843','3844','3845','3846','3854','3855','3856','3857','3858','3861',
  // Tierra del Fuego
  '2901','2964',
  // Tucumán
  '3862','3863','3865','3867','3869','3891','3892','3894',
]);

function getARAreaCode(digits: string): string | null {
  // Primero más específico (4 dígitos) para evitar que "2202" haga match en "220"
  if (AR_AREA_CODES_4.has(digits.slice(0, 4))) return digits.slice(0, 4);
  if (AR_AREA_CODES_3.has(digits.slice(0, 3))) return digits.slice(0, 3);
  if (AR_AREA_CODES_2.has(digits.slice(0, 2))) return digits.slice(0, 2);
  return null;
}
```

### Paso 2 — Comentar `diagnoseAR` actual y reemplazar con versión ENACOM

**Estrategia:** comentar el cuerpo actual de `diagnoseAR` y poner la nueva versión. La nueva versión **mantiene** los chequeos de 0/15 y **agrega** la validación de característica al final.

```typescript
function diagnoseAR(d: string, live = false): string | null {
  // ── Lógica anterior (comentada, conservada como referencia) ──────────────
  // if (d.startsWith('0'))
  //   return 'No incluyas el 0 inicial. Ingresá directo el código de área. Ej: 1134567890';
  // if (d.startsWith('15'))
  //   return 'No incluyas el 15. Ingresá el código de área seguido del número. Ej: 1134567890';
  // if (d.length >= 4 && /^\d{2}15/.test(d))
  //   return 'No incluyas el 15 después del código de área. Ej: para GBA ingresá 1134567890';
  // if (d.length < 10)
  //   return live ? null : `Número incompleto: ingresaste ${d.length} de 10 dígitos`;
  // if (d.length > 10)
  //   return 'El número no puede tener más de 10 dígitos';
  // return null;
  // ─────────────────────────────────────────────────────────────────────────

  if (d.startsWith('0'))
    return 'No incluyas el 0 inicial. Ingresá directo el código de área. Ej: 1134567890';
  if (d.startsWith('15'))
    return 'No incluyas el 15. Ingresá el código de área seguido del número. Ej: 1134567890';
  if (d.length >= 4 && /^\d{2}15/.test(d))
    return 'No incluyas el 15 después del código de área. Ej: para GBA ingresá 1134567890';
  if (d.length < 10)
    return live ? null : `Número incompleto: ingresaste ${d.length} de 10 dígitos`;
  if (d.length > 10)
    return 'El número no puede tener más de 10 dígitos';
  if (!getARAreaCode(d))
    return 'Código de área no reconocido. Verificá que sea una característica argentina válida (ej: 11, 221, 2202).';
  return null;
}
```

---

## Casos de prueba

| Entrada | Resultado esperado |
|---|---|
| `1134567890` | ✅ Válido (11 = CABA/AMBA, 2 dígitos) |
| `2211234567` | ✅ Válido (221 = La Plata, 3 dígitos) |
| `22021234567` | ❌ 11 dígitos → "más de 10 dígitos" |
| `2202123456` | ✅ Válido (2202 = Luján, 4 dígitos) |
| `3511234567` | ✅ Válido (351 = Córdoba, 3 dígitos) |
| `9912345678` | ❌ Código `99` no reconocido |
| `0111234567` | ❌ "No incluyas el 0 inicial" |
| `1512345678` | ❌ "No incluyas el 15" |
| `1115123456` | ❌ "No incluyas el 15 después del código de área" |
| `11345` (live) | ✅ null (no error mientras escribe, aún incompleto) |
| `11345` (blur) | ❌ "Incompleto: 5 de 10 dígitos" |

**Caso portabilidad:** un número de Buenos Aires (`2211234567`) registrado en un negocio de Córdoba → ✅ pasa (validamos la característica, no la provincia del negocio).

---

## Verificación

```powershell
# Type-check
cd "D:\DANILO\METROAPPFINAL\MetroFrontApp"
node node_modules/typescript/bin/tsc --noEmit

# Build
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx ng build --configuration production
```

Luego probar en la app: modal de cliente/empresa en Dashboard, `editar-empresa`, `editar-clientes` — ingresar los casos de la tabla de arriba.
