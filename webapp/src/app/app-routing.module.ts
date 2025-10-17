import { CommonModule } from '@angular/common';
import {  CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from './shared/shared.module';


const routes: Routes = [
  { path: '', redirectTo: 'tasks', pathMatch: 'full' },
  { path: 'auths', loadChildren: () => import('./modules/auths/auths.module').then(m => m.AuthsModule)},
  { path: 'tasks', loadChildren: () => import('./modules/tasks/tasks.module').then(m => m.TasksModule)},
  
  { path: 'errors', loadChildren: () => import('./modules/errors/errors.module').then(m => m.ErrorsModule)},
  { path: '**', redirectTo: 'errors/404/Oups%20!%20La%20page%20que%20vous%20recherchez%20n’existe%20pas.', pathMatch: 'full' }
];


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    RouterModule.forRoot(routes, { useHash: false })
  ],
  exports: [RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],

})
export class AppRoutingModule { }
