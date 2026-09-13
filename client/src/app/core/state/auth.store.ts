import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import type { CreateCompanyAdminRequest } from '../models/auth.model';
import type { User } from '../models/user.model';
import { AuthService } from '../services/auth.service';

type AuthState = {
  user: User | null;
  accessToken: string | null;
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<AuthState>({
    user: null,
    accessToken: null,
  }),
  withComputed(({ user, accessToken }) => ({
    currentUser: user,
    isAuthenticated: computed(() => user() !== null && accessToken() !== null),
    isSuperadmin: computed(() => user()?.platformRole === 'SUPERADMIN'),
  })),
  withMethods((store, authService = inject(AuthService)) => {
    let refreshRequest: Observable<string> | null = null;

    return {
      getAccessToken(): string | null {
        return store.accessToken();
      },

      clearSession(): void {
        patchState(store, { user: null, accessToken: null });
      },

      setSession(accessToken: string, user: User): void {
        patchState(store, { accessToken, user });
      },

      login(credentials: Parameters<AuthService['login']>[0]): Observable<User> {
        return authService.login(credentials).pipe(
          tap(({ accessToken, user }) => {
            patchState(store, { accessToken, user });
          }),
          map(({ user }) => user),
        );
      },

      demoLogin(email: string): Observable<User> {
        return authService.demoLogin(email).pipe(
          tap(({ accessToken, user }) => {
            patchState(store, { accessToken, user });
          }),
          map(({ user }) => user),
        );
      },

      logout(): Observable<void> {
        return authService.logout().pipe(
          tap(() => patchState(store, { user: null, accessToken: null })),
        );
      },

      refresh(): Observable<string> {
        if (!refreshRequest) {
          refreshRequest = authService.refresh().pipe(
            tap((accessToken) => patchState(store, { accessToken })),
            shareReplay(1),
            finalize(() => {
              refreshRequest = null;
            }),
          );
        }

        return refreshRequest;
      },

      loadMe(): Observable<User> {
        return authService.loadMe().pipe(
          tap((user) => patchState(store, { user })),
        );
      },

      restoreSession(): Observable<boolean> {
        if (store.isAuthenticated()) {
          return of(true);
        }

        return authService.refresh().pipe(
          tap((accessToken) => patchState(store, { accessToken })),
          switchMap(() => authService.loadMe()),
          tap((user) => patchState(store, { user })),
          map(() => true),
          catchError(() => {
            patchState(store, { user: null, accessToken: null });
            return of(false);
          }),
        );
      },

      createCompanyAdmin(payload: CreateCompanyAdminRequest) {
        return authService.createCompanyAdmin(payload);
      },

      getDemoPersonas() {
        return authService.getDemoPersonas();
      },
    };
  }),
);
