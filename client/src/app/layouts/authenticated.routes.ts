import { Routes } from '@angular/router';
import { CreateCompanyAdminComponent } from '../features/auth/create-company-admin/create-company-admin.component';
import { DashboardComponent } from '../features/dashboard/dashboard.component';
import { ProfileComponent } from '../features/profile/profile.component';
import { OrganizationSettingsComponent } from '../features/organization-settings/organization-settings.component';
import { CreateProjectComponent } from '../features/projects/create-project/create-project.component';
import { EditProjectComponent } from '../features/projects/edit-project/edit-project.component';
import { ProjectDetailComponent } from '../features/projects/project-detail/project-detail.component';
import { ProjectsComponent } from '../features/projects/projects.component';
import { TeamComponent } from '../features/team/team.component';
import { projectManagerGuard } from '../guards/project-manager.guard';
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
        path: 'projects/new',
        canActivate: [projectManagerGuard],
        component: CreateProjectComponent,
      },
      {
        path: 'projects/:projectId/edit',
        canActivate: [projectManagerGuard],
        component: EditProjectComponent,
      },
      {
        path: 'projects/:projectId',
        component: ProjectDetailComponent,
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
