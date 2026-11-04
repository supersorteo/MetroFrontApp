# Fix: País no se activa al registrar un código nuevo de producción

## Contexto

Cuando el usuario escribe un código nuevo de producción en el formulario de login y hace clic en **"Registrar mi código"**, el formulario de registro se abre con:

- El indicador de país correcto: "País: Argentina" (viene de `codeCountry` ✓)
- El selector de país **deshabilitado y vacío** (`pais = null` ✗)
- Las provincias **no cargadas** ✗
- El botón Registrar **deshabilitado** (`isFormValid = false` porque `isCountryAvailable(null) = false`) ✗

El usuario ve el texto "País: Argentina" pero no puede continuar. Entrar y salir del campo de código no siempre ayuda porque depende de que otra HTTP call termine (latencia en Railway).

---

## Diagnóstico — bug exacto en `enterRegisterStep()`

Archivo: `MetroFrontApp/src/app/componentes/login/login.component.ts`, líneas 617–631.

```typescript
next: (accessCode) => {
  this.codeCountry = countryDisplayName(accessCode?.pais || null);  // ← setea codeCountry
  this.codeNotFoundError = '';
  // ...
  this.loginStep = 'register';   // ← pais = null, onPaisChange() NUNCA se llamó
},
```

`codeCountry` se setea desde la respuesta del servidor.  
`pais` NO se setea → selector de país vacío y deshabilitado (porque `[disabled]="!!codeCountry"`) → usuario atrapado.  
`onPaisChange()` NO se llama → provincias vacías, `registerPhonePrefix` no inicializado.

El template en 'register':
- Línea 169: `*ngIf="codeCountry && !codeNotFoundError"` → muestra "País: Argentina" ✓
- Línea 206: `[disabled]="!!codeCountry"` → selector deshabilitado pero vacío porque `pais = null` ✗
- Línea 199: `[(ngModel)]="pais"` → muestra valor de `pais` (null = vacío) ✗
- `validateForm()` línea 481: `this.isCountryAvailable(this.pais)` → false → botón Registrar deshabilitado ✗

---

## Por qué "entrar y salir del campo" a veces arregla el problema

`onCodeBlur()` llama a `syncCountryWithCode()`, que sí setea `pais`:
```typescript
this.pais = detectedCountry;
this.onPaisChange();
```
Pero es una **segunda HTTP call** con latencia de Railway (2–5 s). Si llega, el formulario se arregla. Si no llega a tiempo, parece roto.

---

## Archivo a modificar

**Único archivo:** `MetroFrontApp/src/app/componentes/login/login.component.ts`

---

## Implementación — bloque `next` de `enterRegisterStep()` (línea ~618)

**Antes:**
```typescript
next: (accessCode) => {
  this.codeCountry = countryDisplayName(accessCode?.pais || null);
  this.codeNotFoundError = '';

  if (accessCode.email && accessCode.email.includes('@')) {
    this.uiDialog.info({
      title: 'Código ya registrado',
      text: `El código "${normalized}" ya tiene una sesión activa. Usá "Ya soy miembro" para ingresar.`
    });
    return;
  }

  this.loginStep = 'register';
},
```

**Después:**
```typescript
next: (accessCode) => {
  const detectedCountry = countryDisplayName(accessCode?.pais || null);
  this.codeCountry = detectedCountry;
  this.codeNotFoundError = '';

  if (accessCode.email && accessCode.email.includes('@')) {
    this.uiDialog.info({
      title: 'Código ya registrado',
      text: `El código "${normalized}" ya tiene una sesión activa. Usá "Ya soy miembro" para ingresar.`
    });
    return;
  }

  if (detectedCountry && this.isCountryAvailable(detectedCountry) && this.pais !== detectedCountry) {
    this.pais = detectedCountry;
    this.onPaisChange();
  }

  this.loginStep = 'register';
},
```

**Qué cambia:**
1. `detectedCountry` se extrae a variable local (evita llamar `countryDisplayName()` dos veces)
2. Después del chequeo de email, se setea `pais = detectedCountry` y se llama `onPaisChange()`
3. `onPaisChange()` carga provincias y setea `registerPhonePrefix` correctamente
4. La guarda `pais !== detectedCountry` evita resetear provincias si ya estaban cargadas

**Casos sin cambio:**
- Código con `pais = null` en DB → `detectedCountry = null` → guarda falla → selector queda habilitado (el usuario selecciona manualmente) ✓
- Código ya registrado (tiene email) → dialog y return antes de tocar `pais` ✓
- Bloque `error` (código no existe): no se modifica ✓

---

## Verificación

1. Ingresar un **código nuevo de producción** → "Registrar mi código" → el formulario de registro debe abrirse con:
   - País pre-seleccionado y deshabilitado (ej: Argentina) ✓
   - Provincias cargadas inmediatamente ✓
   - Teléfono con prefijo correcto (+549 para AR) ✓
   - Botón Registrar habilitado una vez que se llena email, provincia y teléfono ✓

2. Código **ya registrado** (tiene email) → dialog "Código ya registrado", sin cambios en formulario ✓

3. Código de **país no disponible** → `isCountryAvailable()` = false → selector habilitado/vacío como antes ✓

4. TypeScript: `node node_modules/typescript/bin/tsc --noEmit` — sin errores

5. Build: `$env:NODE_OPTIONS="--max-old-space-size=8192"; npx ng build --configuration production`

6. Deploy: `firebase deploy --only hosting`
