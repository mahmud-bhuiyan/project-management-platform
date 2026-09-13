import { Routes } from '@angular/router';
import { CreateCompanyAdminComponent } from '../features/auth/create-company-admin/create-company-admin.component';
import { DashboardComponent } from '../features/dashboard/dashboard.component';
import { ProfileComponent } from '../features/profile/profile.component';
import { OrganizationSettingsComponent } from '../features/organization-settings/organization-settings.component';
import { ProjectsComponent } from '../features/projects/projects.component';
import { TeamComponent } from '../features/team/team.component';
import { superadminGuard } from '../guards/superadmin.guard';
import { AppShellComponent } from './app-shell/app-shell.component';

/** Single lazy chunk: shell + all authenticated pages (no per-route chunk flash). */
export const AUTHENTICATED_ROUTES: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
      },
      {
        path: 'profile',
        component: ProfileComponent,
      },
      {
        path: 'team',
        component: TeamComponent,
      },
      {
        path: 'projects',
        component: ProjectsComponent,
      },
      {
        path: 'organization',
        component: OrganizationSettingsComponent,
      },
      {
        path: 'admin/company-admins',
        canActivate: [superadminGuard],
        component: CreateCompanyAdminComponent,
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
];
