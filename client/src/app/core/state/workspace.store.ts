import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { forkJoin, map, of, switchMap, tap } from 'rxjs';
import { DashboardStore } from './dashboard.store';
import { NotificationsStore } from './notifications.store';
import { OrganizationStore } from './organization.store';
import { ProjectsStore } from './projects.store';
import { TaskDetailStore } from './task-detail.store';
import { TasksStore } from './tasks.store';
import { RealtimeStore } from './realtime.store';
import { TeamStore } from './team.store';

type WorkspaceState = {
  isBootstrapping: boolean;
  bootstrapError: string | null;
  hasBootstrapped: boolean;
};

export const WorkspaceStore = signalStore(
  { providedIn: 'root' },
  withState<WorkspaceState>({
    isBootstrapping: false,
    bootstrapError: null,
    hasBootstrapped: false,
  }),
  withMethods(
    (
      store,
      organizationStore = inject(OrganizationStore),
      dashboardStore = inject(DashboardStore),
      teamStore = inject(TeamStore),
      projectsStore = inject(ProjectsStore),
      tasksStore = inject(TasksStore),
      taskDetailStore = inject(TaskDetailStore),
      notificationsStore = inject(NotificationsStore),
      realtimeStore = inject(RealtimeStore),
    ) => ({
      bootstrap() {
        if (store.hasBootstrapped()) {
          return of(undefined);
        }

        patchState(store, { isBootstrapping: true, bootstrapError: null });

        return organizationStore.loadOrganizations().pipe(
          switchMap(() => {
            const organizationId = organizationStore.activeOrganizationId();

            const unreadCount$ = notificationsStore.loadUnreadCount({
              silent: true,
            });

            if (!organizationId) {
              return unreadCount$.pipe(
                tap(() => {
                  patchState(store, {
                    isBootstrapping: false,
                    hasBootstrapped: true,
                  });
                }),
                map(() => undefined),
              );
            }

            return forkJoin([
              dashboardStore.loadStats({ organizationId }),
              teamStore.loadMembers({ organizationId }),
              projectsStore.loadProjects({ organizationId }),
              unreadCount$,
            ]).pipe(
              tap({
                next: () => {
                  patchState(store, {
                    isBootstrapping: false,
                    hasBootstrapped: true,
                    bootstrapError: null,
                  });
                },
                error: () => {
                  patchState(store, {
                    isBootstrapping: false,
                    hasBootstrapped: true,
                    bootstrapError:
                      'Some workspace data could not be loaded. Try switching organization or refreshing.',
                  });
                },
              }),
            );
          }),
        );
      },

      reset(): void {
        patchState(store, {
          isBootstrapping: false,
          bootstrapError: null,
          hasBootstrapped: false,
        });
      },

      clearSession(): void {
        organizationStore.clear();
        dashboardStore.resetForOrganizationSwitch();
        teamStore.resetForOrganizationSwitch();
        projectsStore.resetForOrganizationSwitch();
        tasksStore.resetForOrganizationSwitch();
        taskDetailStore.resetForOrganizationSwitch();
        notificationsStore.resetForSessionClear();
        realtimeStore.disconnect();
        patchState(store, {
          isBootstrapping: false,
          bootstrapError: null,
          hasBootstrapped: false,
        });
      },

      reloadForActiveOrganization() {
        const organizationId = organizationStore.activeOrganizationId();

        dashboardStore.resetForOrganizationSwitch();
        teamStore.resetForOrganizationSwitch();
        projectsStore.resetForOrganizationSwitch();
        tasksStore.resetForOrganizationSwitch();
        taskDetailStore.resetForOrganizationSwitch();

        if (!organizationId) {
          return of(undefined);
        }

        return forkJoin([
          dashboardStore.loadStats({ organizationId }),
          teamStore.loadMembers({ organizationId }),
          projectsStore.loadProjects({ organizationId }),
        ]).pipe(map(() => undefined));
      },
    }),
  ),
);
