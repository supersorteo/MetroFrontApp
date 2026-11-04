# Fix: False positive "No incluyas el 15 después del código de área"

## Diagnóstico

**Número reportado:** `+549 3415817527` → dígitos locales: `3415817527`

**Código de área real:** `341` (Rosario, Santa Fe) — 3 dígitos
**Abonado:** `5817527` — 7 dígitos → total 10 ✓

**Línea bugueada** — `phone-validation.util.ts` línea 166:
```typescript
if (d.length >= 4 && /^\d{2}15/.test(d))
  return 'No incluyas el 15 después del código de área...';
```

El regex `/^\d{2}15/` asume que el código de área siempre tiene **2 dígitos** y verifica si las posiciones 2-3 son `15`. Para `3415817527`:
- pos 0-1 → `34` (coincide con `\d{2}`)
- pos 2-3 → `15` (coincide con `15`) → **falso positivo**

Pero `341` es un código de 3 dígitos; el `15` detectado cruza el último dígito del área (`1`) con el primer dígito del abonado (`5`), que no tiene nada de incorrecto.

---

## Archivo a modificar

**Único archivo:** `MetroFrontApp/src/app/core/utils/phone-validation.util.ts`

---

## Implementación

Reemplazar la línea 166 con un chequeo que use `getARAreaCode()` para determinar el largo real del código de área antes de verificar si el abonado empieza con `15`.

**Antes (línea 166):**
```typescript
if (d.length >= 4 && /^\d{2}15/.test(d))
  return 'No incluyas el 15 después del código de área. Ej: para GBA ingresá 1134567890';
```

**Después:**
```typescript
if (d.length >= 4) {
  const areaCode = getARAreaCode(d);
  if (areaCode && d.slice(areaCode.length).startsWith('15'))
    return 'No incluyas el 15 después del código de área. Ej: para GBA ingresá 1134567890';
}
```

**Por qué funciona:**
- `getARAreaCode('3415817527')` → devuelve `'341'` (3 dígitos)
- `d.slice(3)` = `'5817527'` → NO empieza con `'15'` → sin error ✓
- `getARAreaCode('1115123456')` → devuelve `'11'` (2 dígitos)
- `d.slice(2)` = `'15123456'` → empieza con `'15'` → error correcto ✓
- `getARAreaCode('220215XXXX')` → devuelve `'2202'` (4 dígitos)
- `d.slice(4)` = `'15XXXX'` → empieza con `'15'` → error correcto ✓

---

## Casos de prueba

| Input | Código de área | ¿Error? | Esperado |
|-------|----------------|---------|----------|
| `3415817527` | `341` (3d) | No | ✅ Válido |
| `2215123456` | `221` (3d) | No | ✅ Válido (221 La Plata, abonado 5123456) |
| `1115123456` | `11` (2d) | Sí — "No incluyas el 15" | ✅ Correcto |
| `1134567890` | `11` (2d) | No | ✅ Válido |
| `220215xxxx` | `2202` (4d) | Sí — "No incluyas el 15" | ✅ Correcto |
| `2202123456` | `2202` (4d) | No | ✅ Válido |

---

## Verificación

1. Registrar empresa/cliente con `+549` + `3415817527` → sin error.
2. Intentar `+549` + `1115123456` → error "No incluyas el 15 después del código de área".
3. `node node_modules/typescript/bin/tsc --noEmit` — sin errores.
