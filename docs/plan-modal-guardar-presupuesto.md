# Plan: Modal guardar presupuesto — opción Actualizar + Guardar como nuevo

## Contexto

El modal de guardar presupuesto (`.save-budget-modal`) actualmente tiene un solo botón que actualiza el presupuesto cargado. El usuario necesita poder reutilizar las tareas de un presupuesto cargado para generar uno **nuevo** (ej: mismas tareas para otra empresa o cliente) sin tener que recargar las tareas desde cero.

**Regla de negocio:**
- Sin presupuesto cargado (`presupuestoSeleccionado === null`) → solo botón **Guardar** (nuevo)
- Con presupuesto cargado → dos botones: **Actualizar** (sobreescribe el existente) + **Guardar como nuevo** (crea un nuevo presupuesto)
- "Guardar como nuevo" requiere que el nombre sea diferente al del presupuesto cargado

---

## Archivos a modificar

### 1. `dashboard.component.html` — modal lines ~3312–3356

**Cambios al footer del modal:**
```html
<div class="save-budget-modal__footer">
  <button type="button" class="btn btn-outline-secondary" (click)="closeSaveBudgetModal()">Cancelar</button>

  <!-- Solo cuando hay presupuesto cargado: botón Guardar como nuevo -->
  <button
    *ngIf="presupuestoSeleccionado"
    type="button"
    class="btn btn-outline-primary"
    [disabled]="!nombrePresupuestoModal.trim() || nombrePresupuestoModal.trim() === presupuestoSeleccionado?.name"
    (click)="guardarComoNuevoDesdeModal()"
    title="Crea un presupuesto nuevo con estas tareas. Cambiá el nombre primero.">
    Guardar como nuevo
  </button>

  <!-- Botón principal: "Guardar" si es nuevo, "Actualizar" si hay presupuesto cargado -->
  <button
    type="button"
    class="btn btn-primary"
    [disabled]="!nombrePresupuestoModal.trim()"
    (click)="guardarPresupuestoDesdeModal()">
    {{ presupuestoSeleccionado ? 'Actualizar' : 'Guardar' }}
  </button>
</div>
```

**Añadir hint debajo del input de nombre** (cuando el nombre no cambió y hay presupuesto cargado):
```html
<small
  *ngIf="presupuestoSeleccionado && nombrePresupuestoModal.trim() === presupuestoSeleccionado?.name"
  class="text-muted">
  Para guardar como nuevo, cambiá el nombre del presupuesto.
</small>
```

---

### 2. `dashboard.component.ts`

**Nuevo método `guardarComoNuevoDesdeModal()`** (agregar cerca de `guardarPresupuestoDesdeModal`):
```typescript
guardarComoNuevoDesdeModal(): void {
  if (this.codeExpired) { this.showExpiredMessage(); return; }
  const nombre = this.nombrePresupuestoModal.trim();
  if (!nombre || !this.presupuestosGuardadosComponent) return;
  if (nombre === this.presupuestoSeleccionado?.name) {
    this.appToast.error('Cambiá el nombre para crear un presupuesto nuevo.');
    return;
  }
  this.showSaveBudgetModal = false;
  this.presupuestosGuardadosComponent.nombreTemporal = nombre;
  this.presupuestosGuardadosComponent.guardarComoNuevo();
  this.nombrePresupuestoModal = '';
}
```

---

### 3. `presupuestos-guardados.component.ts`

**Nuevo método público `guardarComoNuevo()`** (agregar junto a `guardarPresupuestoActual`):
```typescript
guardarComoNuevo(): void {
  if (this.isSavingBudget) return;
  if (this.tareasActuales.length === 0) { this.appToast.error('Agrega tareas al presupuesto'); return; }
  const nombre = this.nombreTemporal.trim();
  if (!nombre) { this.appToast.error('El nombre del presupuesto es obligatorio'); return; }
  if (this.nombreYaExiste(nombre)) { this.appToast.error('Ya existe un presupuesto con este nombre. Elige otro.'); return; }
  if (this.limiteAlcanzado) {
    this.uiDialog.info({ title: 'Límite alcanzado', text: `Tu plan permite guardar hasta ${this.maxItems} presupuestos.` });
    return;
  }
  const payload: any = {
    name: nombre,
    tareas: this.tareasActuales.map(t => ({ id: t.id })),
    cliente: this.clienteActual?.id ? { id: this.clienteActual.id } : null,
    empresa: this.empresaActual?.id ? { id: this.empresaActual.id } : null
  };
  this.isSavingBudget = true;
  this.budgetService.guardarPresupuesto(payload).subscribe({
    next: (nuevo) => {
      this.isSavingBudget = false;
      this.nombreTemporal = '';
      this.presupuestoActualizado.emit(nuevo); // carga el nuevo presupuesto en el dashboard
      this.notifyBudgetSaved('guardado', nuevo);
    },
    error: (err) => {
      this.isSavingBudget = false;
      this.uiDialog.error({ title: 'Error al guardar', text: err.error?.error || 'No se pudo guardar el presupuesto.' });
    }
  });
}
```

**Nota:** emite `presupuestoActualizado` (no `presupuestoGuardado`) para que `onPresupuestoActualizado` en el dashboard cargue automáticamente el nuevo presupuesto, exactamente igual que al actualizar uno existente.

---

## Flujo resultante

| Situación | Botones visibles | Comportamiento |
|-----------|-----------------|----------------|
| Sin presupuesto cargado | Cancelar + Guardar | Crea nuevo (flujo actual) |
| Con presupuesto cargado, mismo nombre | Cancelar + **Guardar como nuevo** (disabled) + Actualizar | Hint: "Cambiá el nombre" |
| Con presupuesto cargado, nombre cambiado | Cancelar + **Guardar como nuevo** (enabled) + Actualizar | Guardar nuevo o actualizar existente |

---

## Verificación

1. Sin presupuesto cargado: abrir modal → solo aparece botón "Guardar"
2. Con presupuesto cargado: abrir modal → aparecen "Actualizar" + "Guardar como nuevo"
3. Con nombre igual al cargado: "Guardar como nuevo" está deshabilitado y se muestra el hint
4. "Actualizar": actualiza el presupuesto existente (comportamiento previo)
5. "Guardar como nuevo" con nombre diferente: crea presupuesto nuevo y lo carga automáticamente
6. El nuevo presupuesto tiene las mismas tareas, empresa y cliente que el cargado
