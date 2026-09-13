import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Observable, finalize, map, tap } from 'rxjs';
import type { Organization } from '../models/organization.model';
import { OrganizationService } from '../services/organization.service';

const STORAGE_KEY = 'flowdesk:activeOrganizationId';

type OrganizationState = {
  organizations: Organization[];
  activeOrganizationId: string | null;
  isLoading: boolean;
};

function readStoredOrganizationId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistOrganizationId(organizationId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, organizationId);
  } catch {
    // Ignore storage failures in private browsing or restricted contexts.
  }
}

function removeStoredOrganizationId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures in private browsing or restricted contexts.
  }
}

function organizationsEqual(
  current: Organization[],
  next: Organization[],
): boolean {
  if (current.length !== next.length) {
    return false;
  }

  const nextById = new Map(next.map((organization) => [organization.id, organization]));

  return current.every((organization) => {
    const updated = nextById.get(organization.id);

    if (!updated) {
      return false;
    }

    return (
      organization.name === updated.name &&
      organization.slug === updated.slug &&
      organization.role === updated.role &&
      organization.updatedAt === updated.updatedAt
    );
  });
}

function syncActiveOrganization(
  organizations: Organization[],
  activeOrganizationId: string | null,
): string | null {
  if (
    activeOrganizationId &&
    organizations.some((organization) => organization.id === activeOrganizationId)
  ) {
    return activeOrganizationId;
  }

  if (organizations.length > 0) {
    const nextId = organizations[0].id;
    persistOrganizationId(nextId);
    return nextId;
  }

  removeStoredOrganizationId();
  return null;
}

export const OrganizationStore = signalStore(
  { providedIn: 'root' },
  withState<OrganizationState>({
    organizations: [],
    activeOrganizationId: readStoredOrganizationId(),
    isLoading: false,
  }),
  withComputed(({ organizations, activeOrganizationId }) => ({
    activeOrganization: computed(() => {
      const activeId = activeOrganizationId();
      return (
        organizations().find((organization) => organization.id === activeId) ??
        null
      );
    }),
  })),
  withMethods((store, organizationService = inject(OrganizationService)) => ({
    loadOrganizations(options?: {
      silent?: boolean;
    }): Observable<Organization[]> {
      const hasCached = store.organizations().length > 0;
      const silent = options?.silent ?? hasCached;

      if (!silent) {
        patchState(store, { isLoading: true });
      }

      return organizationService.listOrganizations().pipe(
        tap((organizations) => {
          if (!organizationsEqual(store.organizations(), organizations)) {
            const activeOrganizationId = syncActiveOrganization(
              organizations,
              store.activeOrganizationId(),
            );
            patchState(store, { organizations, activeOrganizationId });
          }
        }),
        finalize(() => patchState(store, { isLoading: false })),
      );
    },

    setActiveOrganization(organizationId: string): void {
      patchState(store, { activeOrganizationId: organizationId });
      persistOrganizationId(organizationId);
    },

    clear(): void {
      patchState(store, {
        organizations: [],
        activeOrganizationId: null,
        isLoading: false,
      });
      removeStoredOrganizationId();
    },

    updateOrganization(params: {
      organizationId: string;
      name: string;
    }): Observable<void> {
      const { organizationId, name } = params;

      return organizationService.updateOrganization(organizationId, { name }).pipe(
        tap((updated) => {
          patchState(store, {
            organizations: store.organizations().map((organization) =>
              organization.id === updated.id
                ? {
                    ...organization,
                    name: updated.name,
                    slug: updated.slug,
                    updatedAt: updated.updatedAt,
                  }
                : organization,
            ),
          });
        }),
        map(() => undefined),
      );
    },
  })),
);
