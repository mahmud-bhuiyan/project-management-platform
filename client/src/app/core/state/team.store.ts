import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import type { OrganizationMember } from '../models/organization-member.model';
import type { OrganizationRole } from '../models/organization.model';
import { OrganizationService } from '../services/organization.service';

type TeamState = {
  members: OrganizationMember[];
  membersOrganizationId: string | null;
  membersError: string | null;
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

export const TeamStore = signalStore(
  { providedIn: 'root' },
  withState<TeamState>({
    members: [],
    membersOrganizationId: null,
    membersError: null,
    isLoading: false,
    hasLoaded: false,
  }),
  withMethods((store, organizationService = inject(OrganizationService)) => ({
    resetForOrganizationSwitch(): void {
      patchState(store, {
        members: [],
        membersOrganizationId: null,
        membersError: null,
        hasLoaded: false,
      });
    },

    loadMembers(params: {
      organizationId: string;
      silent?: boolean;
    }): Observable<OrganizationMember[]> {
      const { organizationId, silent = false } = params;

      if (!silent) {
        patchState(store, { isLoading: true, membersError: null });
      }

      return organizationService.loadMembers(organizationId).pipe(
        tap({
          next: (members) => {
            patchState(store, {
              members,
              membersOrganizationId: organizationId,
              membersError: null,
              isLoading: false,
              hasLoaded: true,
            });
          },
          error: (error) => {
            patchState(store, {
              members: [],
              membersOrganizationId: organizationId,
              membersError: extractErrorMessage(error),
              isLoading: false,
              hasLoaded: true,
            });
          },
        }),
      );
    },

    addMember(params: {
      organizationId: string;
      email: string;
      role?: OrganizationRole;
    }): Observable<OrganizationMember> {
      const { organizationId, email, role } = params;

      return organizationService.addMember(organizationId, { email, role }).pipe(
        tap((member) => {
          if (store.membersOrganizationId() === organizationId) {
            patchState(store, {
              members: [...store.members(), member],
            });
          }
        }),
      );
    },

    updateMemberRole(params: {
      organizationId: string;
      memberId: string;
      role: OrganizationRole;
    }): Observable<OrganizationMember> {
      const { organizationId, memberId, role } = params;

      return organizationService
        .updateMemberRole(organizationId, memberId, role)
        .pipe(
          tap((updatedMember) => {
            if (store.membersOrganizationId() === organizationId) {
              patchState(store, {
                members: store
                  .members()
                  .map((member) =>
                    member.id === updatedMember.id ? updatedMember : member,
                  ),
              });
            }
          }),
        );
    },

    removeMember(params: {
      organizationId: string;
      memberId: string;
    }): Observable<void> {
      const { organizationId, memberId } = params;

      return organizationService.removeMember(organizationId, memberId).pipe(
        tap(() => {
          if (store.membersOrganizationId() === organizationId) {
            patchState(store, {
              members: store.members().filter((member) => member.id !== memberId),
            });
          }
        }),
      );
    },
  })),
);
