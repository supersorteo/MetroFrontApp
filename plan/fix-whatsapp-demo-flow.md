# Plan: Fix flujo WhatsApp en modo demo

## Contexto

En el dashboard, cuando un usuario en **modo demo** abre el modal de planes y elige "Pagar por WhatsApp", el método `pagarPorWhatsApp()` abre WhatsApp correctamente pero luego muestra el **overlay de reactivación** (`showDashboardReactivateModal = true`). Ese overlay es para usuarios con un código real (activo o vencido) que quieren ingresar su nuevo código. Para usuarios demo no tiene sentido — deben ser redirigidos al flujo de registro del login para que puedan registrar el código que van a recibir por WhatsApp.

Comportamiento correcto:
| Estado del usuario | Acción | Resultado esperado |
|---|---|---|
| **Modo demo** (`trialMode=true`) | "Pagar por WhatsApp" | Redirigir a `/?step=join` (login) |
| **Usuario con código** (real o vencido) | "Pagar por WhatsApp" | Mostrar overlay de reactivación (comportamiento actual ✓) |

---

## Fix — `pagarPorWhatsApp()` en dashboard.component.ts

**Archivo:** `src/app/componentes/dashboard/dashboard.component.ts`
**Método:** `pagarPorWhatsApp()` (~línea 411)

**Código actual:**
```typescript
pagarPorWhatsApp(): void {
  if (!this.selectedPlanMeses) return;
  // ... construye y abre URL de WhatsApp
  window.open(nativeUrl, '_blank');

  if (this.planesModal) this.planesModal.hide();
  this.dashReactivateEmail = this.userData?.email || '';
  this.dashReactivateNewCode = '';
  this.dashReactivateError = '';
  setTimeout(() => { this.showDashboardReactivateModal = true; }, 350);
}
```

**Código corregido:**
```typescript
pagarPorWhatsApp(): void {
  if (!this.selectedPlanMeses) return;
  // ... construye y abre URL de WhatsApp (sin cambios)
  window.open(nativeUrl, '_blank');

  if (this.planesModal) this.planesModal.hide();

  if (this.trialMode) {
    // Demo: redirigir al login para que el usuario registre su nuevo código
    setTimeout(() => this.route.navigate(['/'], { queryParams: { step: 'join' } }), 350);
  } else {
    // Usuario con código real o vencido: mostrar overlay de reactivación
    this.dashReactivateEmail = this.userData?.email || '';
    this.dashReactivateNewCode = '';
    this.dashReactivateError = '';
    setTimeout(() => { this.showDashboardReactivateModal = true; }, 350);
  }
}
```

El login component ya maneja `step=join` en `ngOnInit` (`loginStep = 'join'`), por lo que no se requieren cambios adicionales.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/app/componentes/dashboard/dashboard.component.ts` | Condición `trialMode` en `pagarPorWhatsApp()` |

---

## Verificación
1. Entrar en modo demo → dashboard → abrir modal de planes → seleccionar plan → "Pagar por WhatsApp" → WhatsApp se abre Y la app navega a `/?step=join` (NO aparece el overlay de reactivación)
2. Con usuario real de código vencido → mismo flujo → WhatsApp se abre Y aparece el overlay de reactivación ✓
