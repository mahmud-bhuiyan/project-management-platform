import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../core/state/auth.store';

export const superadminGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (!authStore.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  if (authStore.isSuperadmin()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
