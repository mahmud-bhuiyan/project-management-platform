import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import type {
  CreateProjectInput,
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
  }),
  withMethods((store, projectsService = inject(ProjectsService)) => ({
    resetForOrganizationSwitch(): void {
      patchState(store, {
        projects: [],
        projectsOrganizationId: null,
        projectsError: null,
        hasLoaded: false,
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
  })),
);
