import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import type { DashboardStats } from '../models/dashboard.model';
import { DashboardService } from '../services/dashboard.service';

type DashboardState = {
  stats: DashboardStats | null;
  statsOrganizationId: string | null;
  statsError: string | null;
  isLoading: boolean;
  hasLoaded: boolean;
};

function extractErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error;

    if (body && typeof body === 'object' && 'message' in body) {
      return String(body.message);
    }
  }

  return 'Something went wrong. Please try again.';
}

export const DashboardStore = signalStore(
  { providedIn: 'root' },
  withState<DashboardState>({
    stats: null,
    statsOrganizationId: null,
    statsError: null,
    isLoading: false,
    hasLoaded: false,
  }),
  withMethods((store, dashboardService = inject(DashboardService)) => ({
    resetForOrganizationSwitch(): void {
      patchState(store, {
        stats: null,
        statsOrganizationId: null,
        statsError: null,
        hasLoaded: false,
      });
    },

    loadStats(params: {
      organizationId: string;
      silent?: boolean;
    }): Observable<DashboardStats> {
      const { organizationId, silent = false } = params;

      if (!silent) {
        patchState(store, { isLoading: true, statsError: null });
      }

      return dashboardService.loadStats(organizationId).pipe(
        tap({
          next: (stats) => {
            patchState(store, {
              stats,
              statsOrganizationId: organizationId,
              statsError: null,
              isLoading: false,
              hasLoaded: true,
            });
          },
          error: (error) => {
            patchState(store, {
              stats: null,
              statsOrganizationId: organizationId,
              statsError: extractErrorMessage(error),
              isLoading: false,
              hasLoaded: true,
            });
          },
        }),
      );
    },
  })),
);
