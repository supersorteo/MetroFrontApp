# Agregar controles de código a tabla Legacy (generate-code)

## Contexto

La tabla de **códigos generados** (`#sec-codes`) tiene 4 controles por fila:
- **Copiar** código
- **Cerrar sesiones** activas
- **Editar límite de dispositivos**
- **Desactivar / Activar** código

La tabla de **códigos legacy** (`#sec-legacy`, solo Argentina) solo tiene ↺ reset claim y 🗑 eliminar.
El usuario quiere paridad: agregar los mismos 4 controles a la tabla legacy para tener el mismo nivel de control sobre esos códigos.

---

## Hallazgos técnicos

### LegacyCodeDTO (legacy-code.service.ts línea 7)
No tiene `disabled` ni `maxDevices`. Solo: `code`, `meses`, `fechaAdquisicion`, `fechaVencimiento`, `fechaCreacion`, `claimed`, `claimedByEmail`, `claimedAt`.

### Métodos de auth existentes (reutilizables por code string)
- `disableCode(code)` → `PATCH /codes/{code}/disable`
- `enableCode(code)` → `PATCH /codes/{code}/enable`
- `updateMaxDevices(code, maxDevices)` → `PATCH /codes/{code}/max-devices`
- `getSessionsSummary(codes[])` → `GET /sessions/summary?codes=...`
- `terminateAllSessions(code)` → `DELETE /codes/{code}/sessions`

### Estado compartido existente en el componente (reutilizable)
- `activeSessions: Map<string, number>` — cargado por `loadActiveSessions()` para los códigos con email
- `sessionLimits: Map<string, number>`
- `editingMaxDevicesCode: string | null` + `maxDevicesDraft: number` — usados por los métodos de dispositivos
- `copyToClipboard(code)` — ya funciona con cualquier string, **no requiere cambios**

### HTML de acciones en sec-codes (patrón a replicar)
```html
<button class="ra-btn ra-btn--copy"   (click)="copyToClipboard(item.code)"></button>
<button *ngIf="item.email && (activeSessions.get(item.code) ?? 0) > 0"
        class="ra-btn ra-btn--kick"   (click)="terminateAllSessions(item)"></button>
<button *ngIf="item.email"
        class="ra-btn ra-btn--devices" (click)="openMaxDevicesEdit(item)"></button>
<button class="ra-btn [ra-btn--disable|ra-btn--enable]"
        (click)="toggleDisableCode(item)"></button>
```

---

## Cambios a realizar

### Archivo 1: `src/app/servicios/legacy-code.service.ts`
Agregar dos campos opcionales a `LegacyCodeDTO`:
```typescript
export interface LegacyCodeDTO {
  // campos actuales...
  disabled?: boolean;
  maxDevices?: number | null;
}
```

### Archivo 2: `src/app/componentes/generate-code/generate-code.component.ts`

**A. Extender `loadActiveSessions()`** — incluir también los códigos legacy reclamados:
```typescript
loadActiveSessions(): void {
  const regularCodes = this.codes.filter(c => c.email).map(c => c.code);
  const legacyCodes  = this.legacyCodes.filter(c => c.claimed).map(c => c.code);
  const codes = [...new Set([...regularCodes, ...legacyCodes])];
  if (!codes.length) return;
  this.authService.getSessionsSummary(codes).subscribe(summary => {
    for (const [code, count] of Object.entries(summary)) {
      this.activeSessions.set(code, count as number);
    }
  });
}
```

**B. Extender `applyMaxDevices()`** — actualizar también `legacyCodes` cuando el código pertenece a esa lista:
```typescript
// Después de: const item = this.codes.find(c => c.code === code);
const legacyItem = this.legacyCodes.find(c => c.code === code);
if (legacyItem) legacyItem.maxDevices = res.maxDevices;
```

**C. Nuevo método `openMaxDevicesEditLegacy(lc: LegacyCodeDTO)`** (3 líneas):
```typescript
openMaxDevicesEditLegacy(lc: LegacyCodeDTO): void {
  this.editingMaxDevicesCode = lc.code;
  this.maxDevicesDraft = lc.maxDevices ?? 2;
}
```
`closeMaxDevicesEdit()` y `applyMaxDevices()` se reutilizan sin cambios.

**D. Nuevo método `toggleDisableLegacyCode(lc: LegacyCodeDTO)`**:
```typescript
toggleDisableLegacyCode(lc: LegacyCodeDTO): void {
  const action = lc.disabled ? 'reactivar' : 'desactivar';
  const icon = lc.disabled ? 'question' : 'warning';
  this.uiDialog.confirm({
    title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} el código ${lc.code}?`,
    text: lc.disabled
      ? `El usuario ${lc.claimedByEmail} podrá volver a iniciar sesión.`
      : `El usuario ${lc.claimedByEmail} no podrá iniciar sesión hasta que lo reactives.`,
    confirmText: `Sí, ${action}`,
    cancelText: 'Cancelar',
    tone: lc.disabled ? 'primary' : 'warning',
    icon
  }).then(confirmed => {
    if (!confirmed) return;
    const obs = lc.disabled ? this.authService.enableCode(lc.code) : this.authService.disableCode(lc.code);
    obs.subscribe({
      next: res => {
        lc.disabled = res.disabled;
        this.uiDialog.success({
          title: lc.disabled ? 'Código desactivado' : 'Código reactivado',
          text: lc.disabled
            ? `El código ${lc.code} fue desactivado.`
            : `El código ${lc.code} fue reactivado correctamente.`
        });
      },
      error: () => this.uiDialog.error({ title: 'Error', text: `No se pudo ${action} el código.` })
    });
  });
}
```

### Archivo 3: `src/app/componentes/generate-code/generate-code.component.html`

En la columna de acciones de `#sec-legacy`, agregar antes del botón ↺ y del delete:

```html
<!-- Copiar código -->
<button class="ra-btn ra-btn--copy" title="Copiar" (click)="copyToClipboard(lc.code)">
  <!-- mismo SVG clipboard que sec-codes -->
</button>

<!-- Cerrar sesiones (solo si reclamado y tiene sesiones activas) -->
<button *ngIf="lc.claimed && (activeSessions.get(lc.code) ?? 0) > 0"
        class="ra-btn ra-btn--kick" title="Cerrar sesiones activas"
        (click)="terminateAllSessions({code: lc.code, email: lc.claimedByEmail} as any)">
  <!-- mismo SVG logout que sec-codes -->
</button>

<!-- Editar límite de dispositivos (solo si reclamado) -->
<button *ngIf="lc.claimed" class="ra-btn ra-btn--devices" title="Editar límite de dispositivos"
        (click)="openMaxDevicesEditLegacy(lc)">
  <!-- mismo SVG dispositivos que sec-codes -->
</button>

<!-- Desactivar / Activar (solo si reclamado) -->
<button *ngIf="lc.claimed"
        class="ra-btn"
        [class.ra-btn--disable]="!lc.disabled"
        [class.ra-btn--enable]="lc.disabled"
        [title]="lc.disabled ? 'Activar código' : 'Desactivar código'"
        (click)="toggleDisableLegacyCode(lc)">
  <svg *ngIf="!lc.disabled"><!-- candado cerrado --></svg>
  <svg *ngIf="lc.disabled"><!-- candado abierto --></svg>
</button>
```

Los SVGs se copian exactamente de `#sec-codes` (mismos íconos para consistencia visual).

---

## Notas de diseño

- **Copiar**: siempre visible (el código string siempre existe).
- **Cerrar sesiones / Dispositivos / Desactivar**: solo si `lc.claimed` — los códigos no reclamados no tienen usuario asociado.
- `terminateAllSessions` recibe un `AccessCode`; para legacy pasamos `{code, email}` como cast (`as any`).

---

## Verificación

1. Build prod sin errores TypeScript.
2. Admin Argentina → panel Legacy → un código reclamado → verificar que aparecen los 4 botones nuevos.
3. Copiar → clipboard recibe el código.
4. Editar dispositivos → se abre el overlay/inline edit, se guarda → el límite cambia en el map.
5. Desactivar → modal confirma → código queda `disabled: true` → botón cambia a "Activar".
6. Cerrar sesiones → solo visible si hay sesiones activas según `activeSessions` map.
