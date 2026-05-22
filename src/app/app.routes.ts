import { Routes } from '@angular/router';
import { AuthGuard } from './guard/auth.guard';
import { AuthLoggedGuard } from './guard/auth-logged.guard';
import { AdminGuard } from './guard/admin.guard';

export const routes: Routes = [
  // Eager: login y payment-result se necesitan de inmediato
  {
    path: '',
    loadComponent: () =>
      import('./componentes/login/login.component').then(m => m.LoginComponent),
    canActivate: [AuthLoggedGuard]
  },
  {
    path: 'payment-result',
    loadComponent: () =>
      import('./componentes/payment-result/payment-result.component').then(m => m.PaymentResultComponent)
  },

  // Lazy: se cargan solo cuando el usuario navega a esa ruta
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./componentes/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'presupuesto',
    loadComponent: () =>
      import('./componentes/datos-de-tareas/datos-de-tareas.component').then(m => m.DatosDeTareasComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'calculadora',
    loadComponent: () =>
      import('./componentes/calculadora-materiales/calculadora-materiales.component').then(m => m.CalculadoraMaterialesComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'editar-clientes/:id',
    loadComponent: () =>
      import('./componentes/editar-clientes/editar-clientes.component').then(m => m.EditarClientesComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'editar-empresa/:id',
    loadComponent: () =>
      import('./componentes/editar-empresa/editar-empresa.component').then(m => m.EditarEmpresaComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'admin-generate-code',
    loadComponent: () =>
      import('./componentes/generate-code/generate-code.component').then(m => m.GenerateCodeComponent),
    canActivate: [AdminGuard]
  },
  {
    path: 'ofrecimiento',
    loadComponent: () =>
      import('./componentes/ofrecimiento-laboral/ofrecimiento-laboral.component').then(m => m.OfrecimientoLaboralComponent)
  },

  { path: '**', redirectTo: '', pathMatch: 'full' }
];
