import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthStore } from '../core/state/auth.store';

export const guestGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    return router.createUrlTree(['/dashboard']);
  }

  return authStore.restoreSession().pipe(
    map((restored) =>
      restored ? router.createUrlTree(['/dashboard']) : true,
    ),
  );
};
