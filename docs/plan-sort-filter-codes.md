# Tabla de códigos Admin — Sorting y Filtros

## Contexto

En el panel admin (`generate-code.component`), la tabla de códigos solo tiene búsqueda de texto libre. El usuario necesita tres controles adicionales:

1. **Ordenar por fecha** — toggle más nuevo → más viejo / más viejo → más nuevo
2. **Filtrar por tipo de plan** — Todos / 3 meses / 6 meses / 12 meses
3. **Filtrar por estado** — Todos / Sin cliente (`!email`) / Reservados (`item.disabled`)

Los datos ya existen en la interfaz `AccessCode`: `tipo` derivado en `loadCodes()`, `email` para detectar sin cliente, `disabled` para detectar reservados.

---

## Archivos a modificar

- `src/app/componentes/generate-code/generate-code.component.ts`
- `src/app/componentes/generate-code/generate-code.component.html`

---

## Implementación — TypeScript

### 1. Propiedades nuevas (después de `filterText = ''`, ~línea 46)

```typescript
sortOrder: 'desc' | 'asc' = 'desc';
filterTipo: '' | '3 meses' | '6 meses' | '12 meses' = '';
filterEstado: '' | 'sin-cliente' | 'reservados' = '';
```

### 2. Método nuevo `toggleSort()` (antes o después de `filterCodes()`)

```typescript
toggleSort(): void {
  this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
  this.applyFilter();
}
```

### 3. Reemplazar `applyFilter()` (líneas 231–246)

**Antes:**
```typescript
applyFilter(): void {
  const f = this.filterText.toLowerCase();
  this.filteredCodes = this.codes.filter(c =>
    (c.code?.toLowerCase().includes(f)) ||
    (c.email?.toLowerCase().includes(f)) ||
    ...
  );
  this.currentPage = 1;
  this.totalPages = Math.ceil(this.filteredCodes.length / this.itemsPerPage);
}
```

**Después:**
```typescript
applyFilter(): void {
  let result = [...this.codes];

  const f = this.filterText.toLowerCase();
  if (f) {
    result = result.filter(c =>
      (c.code?.toLowerCase().includes(f)) ||
      (c.email?.toLowerCase().includes(f)) ||
      (c.username?.toLowerCase().includes(f)) ||
      (c.telefono?.toLowerCase().includes(f)) ||
      (c.provincia?.toLowerCase().includes(f)) ||
      (String(c.fechaRegistro || '').toLowerCase().includes(f)) ||
      (String(c.fechaVencimiento || '').toLowerCase().includes(f))
    );
  }

  if (this.filterTipo) {
    result = result.filter(c => c.tipo === this.filterTipo);
  }

  if (this.filterEstado === 'sin-cliente') {
    result = result.filter(c => !c.email);
  } else if (this.filterEstado === 'reservados') {
    result = result.filter(c => !!c.disabled);
  }

  result.sort((a, b) => {
    const dA = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
    const dB = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
    return this.sortOrder === 'desc' ? dB - dA : dA - dB;
  });

  this.filteredCodes = result;
  this.currentPage = 1;
  this.totalPages = Math.ceil(this.filteredCodes.length / this.itemsPerPage);
}
```

> `loadCodes()` puede conservar su sort inicial (no afecta porque `applyFilter()` re-sortea).

---

## Implementación — HTML

Agregar la barra de controles **entre el input de búsqueda y la tabla** (~línea 247, justo antes del `<div class="table-wrapper">`):

```html
<!-- Sort + filtros de tipo y estado -->
<div class="filter-bar">

  <!-- Ordenar por fecha -->
  <div class="filter-group">
    <span class="filter-label">Ordenar</span>
    <button class="filter-btn" [class.active]="true" (click)="toggleSort()">
      {{ sortOrder === 'desc' ? '↓ Más nuevo' : '↑ Más viejo' }}
    </button>
  </div>

  <!-- Filtro por tipo de plan -->
  <div class="filter-group">
    <span class="filter-label">Plan</span>
    <button class="filter-chip" [class.active]="filterTipo === ''"
      (click)="filterTipo = ''; applyFilter()">Todos</button>
    <button class="filter-chip" [class.active]="filterTipo === '3 meses'"
      (click)="filterTipo = '3 meses'; applyFilter()">3 meses</button>
    <button class="filter-chip" [class.active]="filterTipo === '6 meses'"
      (click)="filterTipo = '6 meses'; applyFilter()">6 meses</button>
    <button class="filter-chip" [class.active]="filterTipo === '12 meses'"
      (click)="filterTipo = '12 meses'; applyFilter()">12 meses</button>
  </div>

  <!-- Filtro por estado -->
  <div class="filter-group">
    <span class="filter-label">Estado</span>
    <button class="filter-chip" [class.active]="filterEstado === ''"
      (click)="filterEstado = ''; applyFilter()">Todos</button>
    <button class="filter-chip chip--pending" [class.active]="filterEstado === 'sin-cliente'"
      (click)="filterEstado = 'sin-cliente'; applyFilter()">Sin cliente</button>
    <button class="filter-chip chip--disabled" [class.active]="filterEstado === 'reservados'"
      (click)="filterEstado = 'reservados'; applyFilter()">Reservados</button>
  </div>

</div>
```

Agregar estilos en el SCSS/CSS del componente (o inline en el HTML con `<style>`):

```scss
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-label {
  font-size: 12px;
  color: var(--text-muted, #888);
  white-space: nowrap;
}

.filter-btn,
.filter-chip {
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid var(--border, #ccc);
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.filter-btn.active,
.filter-chip.active {
  background: var(--accent, #3b82f6);
  border-color: var(--accent, #3b82f6);
  color: #fff;
}

.chip--pending.active  { background: #f59e0b; border-color: #f59e0b; }
.chip--disabled.active { background: #6b7280; border-color: #6b7280; }
```

---

## Verificación

1. Cargar el panel admin → la barra de filtros aparece entre el buscador y la tabla.
2. Clic en "↓ Más nuevo" → toggle a "↑ Más viejo" y la tabla se reordena por fecha ascendente.
3. Seleccionar "6 meses" → solo se muestran códigos de 6 meses; vuelve a "Todos" para resetear.
4. Seleccionar "Sin cliente" → solo filas con `!email` (las que tendrían clase `row--pending`).
5. Seleccionar "Reservados" → solo filas con `disabled === true` (clase `row--disabled`).
6. Combinar tipo + estado + texto → los tres filtros se aplican en cadena.
7. TypeScript: `node node_modules/typescript/bin/tsc --noEmit` — sin errores.
