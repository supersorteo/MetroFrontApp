import { Routes } from '@angular/router';
import { LoginComponent } from './componentes/login/login.component';
import { CalculadoraMaterialesComponent } from './componentes/calculadora-materiales/calculadora-materiales.component';
import { DashboardComponent } from './componentes/dashboard/dashboard.component';
import { AuthGuard } from './guard/auth.guard';
import { AuthLoggedGuard } from './guard/auth-logged.guard';
import { GenerateCodeComponent } from './componentes/generate-code/generate-code.component';
import { DatosDeTareasComponent } from './componentes/datos-de-tareas/datos-de-tareas.component';
import { EditarClientesComponent } from './componentes/editar-clientes/editar-clientes.component';
import { OfrecimientoLaboralComponent } from './componentes/ofrecimiento-laboral/ofrecimiento-laboral.component';
import { EditarEmpresaComponent } from './componentes/editar-empresa/editar-empresa.component';
import { PaymentResultComponent } from './componentes/payment-result/payment-result.component';
import { AdminGuard } from './guard/admin.guard';

export const routes: Routes = [
  {path:'', component:LoginComponent, canActivate: [AuthLoggedGuard]},
  {path:'', redirectTo:'', pathMatch:'full'},
  {path:'dashboard', component:DashboardComponent, canActivate: [AuthGuard] },
  { path: 'presupuesto', component: DatosDeTareasComponent, canActivate: [AuthGuard] },
  { path: 'payment-result', component: PaymentResultComponent },
  {path:'admin-generate-code', component:GenerateCodeComponent, canActivate: [AdminGuard]},
  {path:'editar-clientes/:id', component: EditarClientesComponent, canActivate: [AuthGuard]},
  {path:'ofrecimiento', component: OfrecimientoLaboralComponent},
  {path:'editar-empresa/:id', component:EditarEmpresaComponent, canActivate: [AuthGuard]},
  { path: 'calculadora', component: CalculadoraMaterialesComponent, canActivate: [AuthGuard] },
  {path:'**', redirectTo:'', pathMatch:'full'}
];
