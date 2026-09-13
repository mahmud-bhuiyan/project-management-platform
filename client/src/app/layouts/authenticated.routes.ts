import { Routes } from '@angular/router';
import { CreateCompanyAdminComponent } from '../features/auth/create-company-admin/create-company-admin.component';
import { DashboardComponent } from '../features/dashboard/dashboard.component';
import { ProfileComponent } from '../features/profile/profile.component';
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
