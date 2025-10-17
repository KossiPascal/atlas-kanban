import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from '@kba-src/app/guards/auth-guard';
import { TasksComponent } from './tasks.component';


const routes: Routes = [
  // { path: '', redirectTo: 'page', pathMatch: 'full' },
  { path: '', component: TasksComponent, canActivate: [AuthGuard] },
  // { path: '', component: TasksComponent } // , canActivate: [AuthGuard]
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TasksRoutingModule { }
