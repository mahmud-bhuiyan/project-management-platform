import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import type {
  CreateProjectInput,
  ProjectMember,
  ProjectSummary,
  UpdateProjectInput,
} from '../models/project.model';
import { ProjectsService } from '../services/projects.service';

type ProjectsState = {
  projects: ProjectSummary[];
  projectsOrganizationId: string | null;
  projectsError: string | null;
  isLoading: boolean;
  hasLoaded: boolean;
  membersByProjectId: Record<string, ProjectMember[]>;
  membersLoadedProjectIds: string[];
  membersLoadingProjectId: string | null;
  membersErrorByProjectId: Record<string, string | null>;
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

export const ProjectsStore = signalStore(
  { providedIn: 'root' },
  withState<ProjectsState>({
    projects: [],
    projectsOrganizationId: null,
    projectsError: null,
    isLoading: false,
    hasLoaded: false,
    membersByProjectId: {},
    membersLoadedProjectIds: [],
    membersLoadingProjectId: null,
    membersErrorByProjectId: {},
  }),
  withMethods((store, projectsService = inject(ProjectsService)) => ({
    resetForOrganizationSwitch(): void {
      patchState(store, {
        projects: [],
        projectsOrganizationId: null,
        projectsError: null,
        hasLoaded: false,
        membersByProjectId: {},
        membersLoadedProjectIds: [],
        membersLoadingProjectId: null,
        membersErrorByProjectId: {},
      });
    },

    loadProjects(params: {
      organizationId: string;
      silent?: boolean;
      includeArchived?: boolean;
    }): Observable<ProjectSummary[]> {
      const { organizationId, silent = false, includeArchived = false } = params;

      if (!silent) {
        patchState(store, { isLoading: true, projectsError: null });
      }

      return projectsService.listProjects(organizationId, { includeArchived }).pipe(
        tap({
          next: (projects) => {
            patchState(store, {
              projects,
              projectsOrganizationId: organizationId,
              projectsError: null,
              isLoading: false,
              hasLoaded: true,
            });
          },
          error: (error) => {
            patchState(store, {
              projects: [],
              projectsOrganizationId: organizationId,
              projectsError: extractErrorMessage(error),
              isLoading: false,
              hasLoaded: true,
            });
          },
        }),
      );
    },

    createProject(params: {
      organizationId: string;
      input: CreateProjectInput;
    }): Observable<ProjectSummary> {
      const { organizationId, input } = params;

      return projectsService.createProject(organizationId, input).pipe(
        tap((project) => {
          if (store.projectsOrganizationId() === organizationId) {
            patchState(store, {
              projects: [project, ...store.projects()],
            });
          }
        }),
      );
    },

    updateProject(params: {
      organizationId: string;
      projectId: string;
      input: UpdateProjectInput;
    }): Observable<ProjectSummary> {
      const { organizationId, projectId, input } = params;

      return projectsService
        .updateProject(organizationId, projectId, input)
        .pipe(
          tap((project) => {
            if (store.projectsOrganizationId() === organizationId) {
              patchState(store, {
                projects: store
                  .projects()
                  .map((current) =>
                    current.id === project.id ? project : current,
                  ),
              });
            }
          }),
        );
    },

    projectMembers(projectId: string): ProjectMember[] {
      return store.membersByProjectId()[projectId] ?? [];
    },

    isProjectMembersLoaded(projectId: string): boolean {
      return store.membersLoadedProjectIds().includes(projectId);
    },

    loadProjectMembers(params: {
      organizationId: string;
      projectId: string;
      silent?: boolean;
    }): Observable<ProjectMember[]> {
      const { organizationId, projectId, silent = false } = params;

      if (store.membersLoadedProjectIds().includes(projectId)) {
        return of(store.membersByProjectId()[projectId] ?? []);
      }

      if (!silent) {
        patchState(store, { membersLoadingProjectId: projectId });
      }

      return projectsService.listProjectMembers(organizationId, projectId).pipe(
        tap({
          next: (members) => {
            patchState(store, {
              membersByProjectId: {
                ...store.membersByProjectId(),
                [projectId]: members,
              },
              membersLoadedProjectIds: [
                ...store.membersLoadedProjectIds(),
                projectId,
              ],
              membersLoadingProjectId: null,
              membersErrorByProjectId: {
                ...store.membersErrorByProjectId(),
                [projectId]: null,
              },
            });
          },
          error: (error) => {
            patchState(store, {
              membersLoadingProjectId: null,
              membersErrorByProjectId: {
                ...store.membersErrorByProjectId(),
                [projectId]: extractErrorMessage(error),
              },
            });
          },
        }),
      );
    },
  })),
);
