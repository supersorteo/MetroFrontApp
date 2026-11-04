# Validación CUIT/CUIL — Formato flexible + Módulo 11

## Contexto

La validación actual de CUIT/CUIL tiene tres problemas:
1. Solo acepta formato `XX-XXXXXXXX-X` (con guiones), rechaza los 11 dígitos seguidos.
2. No valida el dígito verificador (algoritmo Módulo 11) — cualquier número de 11 dígitos con guiones pasa.
3. `editar-clientes` no tiene ninguna validación (input libre).

**Estado actual por componente:**
- `editar-empresa` — `[pattern]="\\d{2}-\\d{8}-\\d{1}"` solo, sin mod-11
- `dashboard` modal empresa — ídem
- `dashboard` modal cliente (campo `clave`) — ídem
- `editar-clientes` — **sin pattern ni validación alguna**

---

## Algoritmo Módulo 11 (dígito verificador)

Estructura CUIT/CUIL: `PP-NNNNNNNN-V` (11 dígitos)
- `PP`: prefijo → 20/23/24/27 = PERSONA_FISICA · 30/33/34 = EMPRESA
- `NNNNNNNN`: número base (8 dígitos)
- `V`: dígito verificador

**Cálculo:**
```
weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
sum = Σ(digits[i] * weights[i])  // sobre los primeros 10 dígitos
rest = sum % 11
computed = 11 - rest
if computed == 11 → verificador = 0
if computed == 10 → CUIT/CUIL inválido (imposible)
else → verificador = computed
```

---

## Solución — Nuevo util + actualización de componentes

### Paso 1 — Crear `cuit-validation.util.ts`

**Archivo nuevo:** `MetroFrontApp/src/app/core/utils/cuit-validation.util.ts`

```typescript
export interface CuitValidationResult {
  valid: boolean;
  type: 'EMPRESA' | 'PERSONA_FISICA' | 'UNKNOWN' | null;
  formatted: string | null;  // formato XX-XXXXXXXX-X
  error?: string;            // Level 1: blocking
  warning?: string;          // Level 2: informativo
}

export function cleanCuit(raw: string): string {
  return raw.replace(/[-\s]/g, '');
}

export function formatCuit(digits: string): string {
  if (digits.length !== 11) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

export function validateCuit(raw: string): CuitValidationResult {
  const digits = cleanCuit(raw);

  if (!digits) return { valid: false, type: null, formatted: null };
  if (!/^\d+$/.test(digits))
    return { valid: false, type: null, formatted: null, error: 'Solo se permiten números y guiones.' };
  if (digits.length < 11)
    return { valid: false, type: null, formatted: null, error: `Incompleto: ${digits.length} de 11 dígitos.` };
  if (digits.length > 11)
    return { valid: false, type: null, formatted: null, error: 'No puede tener más de 11 dígitos.' };

  const prefix = parseInt(digits.slice(0, 2), 10);
  const type: CuitValidationResult['type'] =
    [30, 33, 34].includes(prefix) ? 'EMPRESA' :
    [20, 23, 24, 27].includes(prefix) ? 'PERSONA_FISICA' : 'UNKNOWN';

  const formatted = formatCuit(digits);

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * parseInt(digits[i], 10), 0);
  const computed = 11 - (sum % 11);

  if (computed === 10)
    return { valid: false, type, formatted, error: 'CUIT/CUIL inválido: dígito verificador imposible.' };

  const verificador = computed === 11 ? 0 : computed;
  if (verificador !== parseInt(digits[10], 10))
    return { valid: false, type, formatted, error: 'CUIT/CUIL inválido: el dígito verificador no coincide.' };

  const warning = type === 'UNKNOWN' ? 'Prefijo no reconocido, verificá que sea un CUIT/CUIL válido.' : undefined;
  return { valid: true, type, formatted, warning };
}

// Retorna null si válido (o incompleto en modo live), string de error si inválido
export function diagnoseCuit(raw: string, live = false): string | null {
  const digits = cleanCuit(raw);
  if (!digits) return null;
  if (!/^\d+$/.test(digits)) return 'Solo se permiten números y guiones.';
  if (digits.length < 11) return live ? null : `Incompleto: ${digits.length} de 11 dígitos.`;
  if (digits.length > 11) return 'No puede tener más de 11 dígitos.';
  const result = validateCuit(raw);
  return result.valid ? null : (result.error ?? null);
}
```

---

### Paso 2 — `editar-empresa.component`

**TS** (`editar-empresa.component.ts`):
- Importar `validateCuit, diagnoseCuit, cleanCuit, formatCuit` desde el nuevo util
- Agregar propiedad `cuitError: string = ''` y `cuitWarning: string = ''`
- Agregar métodos:
```typescript
onCuitInput(): void {
  if (!this.isArgentina()) { this.cuitError = ''; return; }
  const digits = cleanCuit(this.empresa.cuilCuit || '');
  this.cuitError = diagnoseCuit(this.empresa.cuilCuit || '', true) ?? '';
  if (digits.length === 11) {
    const result = validateCuit(this.empresa.cuilCuit || '');
    this.empresa.cuilCuit = result.formatted ?? this.empresa.cuilCuit;
    this.cuitError = result.error ?? '';
    this.cuitWarning = result.warning ?? '';
  } else {
    this.cuitWarning = '';
  }
}
onCuitBlur(): void {
  if (!this.isArgentina()) return;
  const result = validateCuit(this.empresa.cuilCuit || '');
  if (result.formatted) this.empresa.cuilCuit = result.formatted;
  this.cuitError = result.error ?? '';
  this.cuitWarning = result.warning ?? '';
}
private isArgentina(): boolean {
  return this.editPrefix === '+549' || this.editPrefix === '+54';
}
```
- En `actualizarEmpresa()`: si `this.isArgentina()` y `this.cuitError`, mostrar toast y retornar

**HTML** (`editar-empresa.component.html`):
- Campo CUIT para Argentina: reemplazar `[pattern]="taxIdConfig.pattern"` por `(input)="onCuitInput()" (blur)="onCuitBlur()"`
- Cambiar el mensaje de error:
```html
@if (cuitError) {
  <span class="ef-error">{{ cuitError }}</span>
}
@if (!cuitError && cuitWarning) {
  <span class="ef-hint">{{ cuitWarning }}</span>
}
```
- Para países no Argentina: mantener `[pattern]` del taxIdConfig

---

### Paso 3 — `dashboard.component` (modal empresa + modal cliente)

**TS** (`dashboard.component.ts`):
- Importar el util
- Agregar propiedades `empresaCuitError: string = ''`, `empresaCuitWarning: string = ''`, `clientCuitError: string = ''`, `clientCuitWarning: string = ''`
- Agregar `onEmpresaCuitInput()`, `onEmpresaCuitBlur()`, `onClientCuitInput()`, `onClientCuitBlur()` — mismo patrón que editar-empresa
- En `guardarEmpresa()` / `guardarCliente()`: si el país es Argentina y hay error, no continuar
- `isEmpresaArgentina()`: detectar si el prefix de empresa es `+549` o `+54`

**HTML** (`dashboard.component.html`):
- Modal empresa (línea ~2488): reemplazar `[pattern]="empresaTaxIdConfig.pattern"` por handlers de input/blur, error/warning dinámicos
- Modal cliente (línea ~2134): ídem con `taxIdConfig`

---

### Paso 4 — `editar-clientes.component`

**TS** (`editar-clientes.component.ts`):
- Importar util
- Agregar `claveCuitError: string = ''`, `claveCuitWarning: string = ''`
- Agregar `onClaveCuitInput()`, `onClaveCuitBlur()` — mismo patrón
- En `onSubmit()`: si hay error, bloquear envío

**HTML** (`editar-clientes.component.html`):
- Cambiar el `<input name="clave">` para agregar `(input)` y `(blur)` handlers
- Agregar mensajes de error/warning

---

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `MetroFrontApp/src/app/core/utils/cuit-validation.util.ts` | **Crear** — util completo con mod-11 |
| `MetroFrontApp/src/app/componentes/editar-empresa/editar-empresa.component.ts` | Importar util, agregar métodos onCuitInput/onCuitBlur, validar en submit |
| `MetroFrontApp/src/app/componentes/editar-empresa/editar-empresa.component.html` | Reemplazar `[pattern]` por handlers dinámicos |
| `MetroFrontApp/src/app/componentes/dashboard/dashboard.component.ts` | Importar util, propiedades de error, métodos para empresa y cliente |
| `MetroFrontApp/src/app/componentes/dashboard/dashboard.component.html` | Reemplazar `[pattern]` en ambos modales |
| `MetroFrontApp/src/app/componentes/editar-clientes/editar-clientes.component.ts` | Importar util, agregar validación |
| `MetroFrontApp/src/app/componentes/editar-clientes/editar-clientes.component.html` | Agregar handlers y mensajes |

---

## Verificación

1. Ingresar CUIT con guiones (`20-12345678-9`) → se acepta y muestra la validación
2. Ingresar CUIT sin guiones (`20123456789`) → se auto-formatea a `20-12345678-9` al perder foco
3. Ingresar CUIT con dígito verificador incorrecto → error "el dígito verificador no coincide"
4. Ingresar CUIT incompleto (ej 8 dígitos) → error "Incompleto: 8 de 11 dígitos" solo al perder foco
5. CUIT con prefijo desconocido (ej 99) pero mod-11 correcto → warning no bloqueante
6. Build sin errores: `ng build --configuration production`
