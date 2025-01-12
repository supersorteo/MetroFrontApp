import { Routes } from '@angular/router';
import { LoginComponent } from './componentes/login/login.component';
import { DashboardComponent } from './componentes/dashboard/dashboard.component';
import { AuthGuard } from './guard/auth.guard';
import { AuthLoggedGuard } from './guard/auth-logged.guard';
import { GenerateCodeComponent } from './componentes/generate-code/generate-code.component';

export const routes: Routes = [
  {path:'', component:LoginComponent, canActivate: [AuthLoggedGuard]},
  {path:'', redirectTo:'', pathMatch:'full'},
  {path:'dashboard', component:DashboardComponent, canActivate: [AuthGuard] },

  {path:'admin-generate-code', component:GenerateCodeComponent, canActivate: [AuthGuard]}
];
