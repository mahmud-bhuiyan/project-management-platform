import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OrganizationStore } from '../core/state/organization.store';
import { canManageOrganizationMembers } from '../core/utils/organization-role.util';

/** OWNER/ADMIN only — used for project create/edit pages. */
export const projectManagerGuard: CanActivateFn = () => {
  const organizationStore = inject(OrganizationStore);
  const router = inject(Router);
  const role = organizationStore.activeOrganization()?.role;

  if (role && canManageOrganizationMembers(role)) {
    return true;
  }

  return router.createUrlTree(['/projects']);
};
