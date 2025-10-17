import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ErrorPageComponent } from './error-page.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: '404/Oups%20!%20La%20page%20que%20vous%20recherchez%20n’existe%20pas.',
    pathMatch: 'full'
  },
  {
    path: ':code/:msg',
    component: ErrorPageComponent,
    data: {
      iconMap: {
        '404': '😞',
        '500': '😵',
        '401': '🚫'
      },
      defaultMessage: {
        '404': 'Oups ! La page que vous recherchez n’existe pas.',
        '500': 'Oups ! Il y a eu un problème avec le serveur.',
        '401': 'Vous n’êtes pas autorisé à accéder à cette page.'
      }
    }
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ErrorsRoutingModule {}
