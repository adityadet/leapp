import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ProfilePageComponent} from './shared/profile-page/profile-page.component';
import {IntegrationsPageComponent} from './shared/integrations-page/integrations-page.component';
import {AwsSsoComponent} from './integrations/components/aws-sso/aws-sso.component';

const routes: Routes = [
    {
    path: '',
    children: [
      {
        path: 'start',
        loadChildren: './start/start.module#StartModule' // contains all the components that defines the initial setup
      },
      {
        path: 'managing',
        loadChildren: './managing/managing.module#ManagingModule' // contains all the components that defines the initial setup
      },
      {
        path: 'profile',
        component: ProfilePageComponent // The profile page
      },
      {
        path: 'integrations',
        children: [
          {
            path: 'list',
            component: IntegrationsPageComponent, // The Integration page
          },
          {
            path: 'aws-sso',
            component: AwsSsoComponent
          }
        ]
      },
      {
        path: 'sessions',
        children: [
          {
            path: '',
            loadChildren: './session/session.module#SessionModule' // Starting component for all sessions related, when the app is up and running
          }
        ]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
