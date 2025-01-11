import { Routes } from '@angular/router';
import { LoginComponent } from './componentes/login/login.component';
import { DashboardComponent } from './componentes/dashboard/dashboard.component';

export const routes: Routes = [
  {path:'', component:LoginComponent},
  {path:'', redirectTo:'', pathMatch:'full'},
  {path:'dashboard', component:DashboardComponent}
];
