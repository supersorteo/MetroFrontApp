# BUG: Logo de empresa existente reemplazado al crear nueva empresa

**Fecha:** 2026-10-28  
**Archivo afectado:** `src/app/componentes/dashboard/dashboard.component.ts`  
**Método afectado:** `applyImageUrl()` — línea ~1068

---

## Flujo del bug

1. Usuario tiene **Empresa A** seleccionada (`selectedEmpresaId = empresa A`)
2. Abre formulario **"crear nueva empresa"** → `limpiarEmpresaForm()` pone `empresaEditId = null`, `logoUrl = ''`
3. Sube imagen para la NUEVA empresa
4. El método `uploadImage()` (línea 3372) llama `applyImageUrl(url)` con la URL de la nueva imagen
5. En `applyImageUrl()` línea 1068: la condición `if (this.selectedEmpresaId)` es `true` porque empresa A sigue seleccionada
6. **Resultado:** `selectedEmpresaId.logoUrl` (empresa A) se sobreescribe con la URL de la nueva empresa → logo incorrecto en UI y localStorage

---

## Root cause

```typescript
// dashboard.component.ts — método applyImageUrl(), línea ~1068
private applyImageUrl(url: string): void {
    this.logoUrl = url;
    if (this.empresaEditId) {
      this.currentEmpresaLogoUrl = url;
    }

    if (this.selectedEmpresaId) {               // ← BUG: es true aunque se esté CREANDO
      this.selectedEmpresaId = {
        ...this.selectedEmpresaId,
        logoUrl: url                            // ← sobreescribe logo de empresa existente
      };
      localStorage.setItem('selectedEmpresa', JSON.stringify(this.selectedEmpresaId));
      // ...
    }
}
```

La guarda `if (this.selectedEmpresaId)` no distingue entre:
- "subir imagen mientras edito la empresa seleccionada" → correcto actualizar
- "subir imagen para empresa nueva (empresaEditId = null)" → NO debe actualizar la empresa existente

---

## Fix

**Cambiar la condición en `applyImageUrl()`:**

```typescript
// ANTES (línea ~1068):
if (this.selectedEmpresaId) {

// DESPUÉS:
if (this.selectedEmpresaId && this.empresaEditId !== null && this.empresaEditId === this.selectedEmpresaId.id) {
```

**Lógica de la condición nueva:**
- `this.selectedEmpresaId !== null` → hay empresa seleccionada
- `this.empresaEditId !== null` → estamos en modo EDICIÓN (no creación)
- `this.empresaEditId === this.selectedEmpresaId.id` → editando ESA empresa específica

Al crear nueva empresa: `empresaEditId = null` (lo pone `limpiarEmpresaForm()`) → condición falla → empresa A conserva su logo intacto.

---

## Por qué no afecta el flujo de edición

Cuando el usuario **edita** una empresa existente, `empresaEditId` se setea con el ID de esa empresa. Si esa empresa también es `selectedEmpresaId`, la condición sigue siendo verdadera → comportamiento idéntico al actual.

---

## Verificación

1. Tener Empresa A con logo X seleccionada
2. Crear nueva empresa con logo Y
3. Verificar que Empresa A sigue mostrando logo X (no logo Y)
4. Verificar que la nueva empresa creada tiene logo Y
