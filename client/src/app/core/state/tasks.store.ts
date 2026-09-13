import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Observable,
  catchError,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import type { PaginationMeta } from '../models/api-response.model';
import type {
  CreateTaskInput,
  ReorderTaskItemInput,
  TaskSummary,
  TasksQuery,
  UpdateTaskInput,
} from '../models/task.model';
import { taskMatchesQuery } from '../utils/task.util';
import { TasksService } from '../services/tasks.service';

type ProjectTasksCache = {
  tasks: TaskSummary[];
  meta: PaginationMeta;
  query: TasksQuery;
  error: string | null;
  isLoading: boolean;
  hasLoaded: boolean;
};

type TasksState = {
  organizationId: string | null;
  byProjectId: Record<string, ProjectTasksCache>;
  loadingProjectId: string | null;
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

function defaultQuery(): TasksQuery {
  return { page: 1, limit: 20 };
}

function defaultMeta(query: TasksQuery): PaginationMeta {
  return {
    page: query.page,
    perPage: query.limit,
    total: 0,
    totalPages: 0,
  };
}

function defaultCache(query: TasksQuery = defaultQuery()): ProjectTasksCache {
  return {
    tasks: [],
    meta: defaultMeta(query),
    query,
    error: null,
    isLoading: false,
    hasLoaded: false,
  };
}

function queriesMatch(left: TasksQuery, right: TasksQuery): boolean {
  return (
    left.page === right.page &&
    left.limit === right.limit &&
    left.status === right.status &&
    left.priority === right.priority &&
    left.assigneeId === right.assigneeId &&
    left.search === right.search
  );
}

function getCache(
  byProjectId: Record<string, ProjectTasksCache>,
  projectId: string,
): ProjectTasksCache {
  return byProjectId[projectId] ?? defaultCache();
}

export const TasksStore = signalStore(
  { providedIn: 'root' },
  withState<TasksState>({
    organizationId: null,
    byProjectId: {},
    loadingProjectId: null,
  }),
  withMethods((store, tasksService = inject(TasksService)) => ({
    resetForOrganizationSwitch(): void {
      patchState(store, {
        organizationId: null,
        byProjectId: {},
        loadingProjectId: null,
      });
    },

    projectTasks(projectId: string): TaskSummary[] {
      return getCache(store.byProjectId(), projectId).tasks;
    },

    projectTasksMeta(projectId: string): PaginationMeta {
      return getCache(store.byProjectId(), projectId).meta;
    },

    projectTasksQuery(projectId: string): TasksQuery {
      return getCache(store.byProjectId(), projectId).query;
    },

    projectTasksError(projectId: string): string | null {
      return getCache(store.byProjectId(), projectId).error;
    },

    isProjectTasksLoaded(projectId: string, query?: TasksQuery): boolean {
      const cache = getCache(store.byProjectId(), projectId);
      if (!query) {
        return cache.hasLoaded;
      }

      return cache.hasLoaded && queriesMatch(cache.query, query);
    },

    isLoadingProjectTasks(projectId: string): boolean {
      return store.loadingProjectId() === projectId;
    },

    findTask(projectId: string, taskId: string): TaskSummary | null {
      return (
        getCache(store.byProjectId(), projectId).tasks.find(
          (task) => task.id === taskId,
        ) ?? null
      );
    },

    loadTasks(params: {
      organizationId: string;
      projectId: string;
      query?: TasksQuery;
      silent?: boolean;
      force?: boolean;
    }): Observable<TaskSummary[]> {
      const { organizationId, projectId, silent = false, force = false } = params;
      const query = params.query ?? getCache(store.byProjectId(), projectId).query;
      const existing = getCache(store.byProjectId(), projectId);

      if (
        !force &&
        store.organizationId() === organizationId &&
        existing.hasLoaded &&
        queriesMatch(existing.query, query)
      ) {
        return of(existing.tasks);
      }

      if (!silent) {
        patchState(store, { loadingProjectId: projectId });
      }

      return tasksService.listTasks(organizationId, projectId, query).pipe(
        tap({
          next: ({ tasks, meta }) => {
            patchState(store, {
              organizationId,
              loadingProjectId: null,
              byProjectId: {
                ...store.byProjectId(),
                [projectId]: {
                  tasks,
                  meta,
                  query,
                  error: null,
                  isLoading: false,
                  hasLoaded: true,
                },
              },
            });
          },
          error: (error) => {
            patchState(store, {
              organizationId,
              loadingProjectId: null,
              byProjectId: {
                ...store.byProjectId(),
                [projectId]: {
                  ...defaultCache(query),
                  error: extractErrorMessage(error),
                  isLoading: false,
                  hasLoaded: true,
                },
              },
            });
          },
        }),
        map(({ tasks }) => tasks),
      );
    },

    loadTask(params: {
      organizationId: string;
      projectId: string;
      taskId: string;
    }): Observable<TaskSummary> {
      const cached = this.findTask(params.projectId, params.taskId);
      if (cached) {
        return of(cached);
      }

      return tasksService
        .getTask(params.organizationId, params.projectId, params.taskId)
        .pipe(
          tap((task) => {
            const cache = getCache(store.byProjectId(), params.projectId);
            const exists = cache.tasks.some((entry) => entry.id === task.id);

            patchState(store, {
              organizationId: params.organizationId,
              byProjectId: {
                ...store.byProjectId(),
                [params.projectId]: {
                  ...cache,
                  tasks: exists
                    ? cache.tasks.map((entry) =>
                        entry.id === task.id ? task : entry,
                      )
                    : [...cache.tasks, task],
                  hasLoaded: true,
                },
              },
            });
          }),
        );
    },

    createTask(params: {
      organizationId: string;
      projectId: string;
      input: CreateTaskInput;
    }): Observable<TaskSummary> {
      const { organizationId, projectId, input } = params;

      return tasksService.createTask(organizationId, projectId, input).pipe(
        tap((task) => {
          const cache = getCache(store.byProjectId(), projectId);

          if (
            store.organizationId() !== organizationId ||
            !cache.hasLoaded ||
            !taskMatchesQuery(task, cache.query) ||
            cache.query.page !== 1
          ) {
            return;
          }

          const nextTasks = [task, ...cache.tasks].slice(0, cache.query.limit);

          patchState(store, {
            byProjectId: {
              ...store.byProjectId(),
              [projectId]: {
                ...cache,
                tasks: nextTasks,
                meta: {
                  ...cache.meta,
                  total: cache.meta.total + 1,
                  totalPages: Math.max(
                    1,
                    Math.ceil((cache.meta.total + 1) / cache.query.limit),
                  ),
                },
              },
            },
          });
        }),
      );
    },

    updateTask(params: {
      organizationId: string;
      projectId: string;
      taskId: string;
      input: UpdateTaskInput;
    }): Observable<TaskSummary> {
      const { organizationId, projectId, taskId, input } = params;

      return tasksService
        .updateTask(organizationId, projectId, taskId, input)
        .pipe(
          tap((task) => {
            const cache = getCache(store.byProjectId(), projectId);
            const index = cache.tasks.findIndex((entry) => entry.id === taskId);

            if (index === -1) {
              return;
            }

            const stillMatches = taskMatchesQuery(task, cache.query);
            const nextTasks = stillMatches
              ? cache.tasks.map((entry) => (entry.id === task.id ? task : entry))
              : cache.tasks.filter((entry) => entry.id !== task.id);

            patchState(store, {
              byProjectId: {
                ...store.byProjectId(),
                [projectId]: {
                  ...cache,
                  tasks: nextTasks,
                  meta: stillMatches
                    ? cache.meta
                    : {
                        ...cache.meta,
                        total: Math.max(0, cache.meta.total - 1),
                      },
                },
              },
            });
          }),
        );
    },

    reorderTasks(params: {
      organizationId: string;
      projectId: string;
      items: ReorderTaskItemInput[];
      optimisticTasks?: TaskSummary[];
    }): Observable<TaskSummary[]> {
      const { organizationId, projectId, items, optimisticTasks } = params;
      const cache = getCache(store.byProjectId(), projectId);
      const query = cache.query;
      const previousTasks = cache.tasks;

      if (optimisticTasks) {
        patchState(store, {
          byProjectId: {
            ...store.byProjectId(),
            [projectId]: {
              ...cache,
              tasks: optimisticTasks,
              error: null,
            },
          },
        });
      }

      return tasksService.reorderTasks(organizationId, projectId, items).pipe(
        switchMap(() =>
          this.loadTasks({
            organizationId,
            projectId,
            query,
            silent: true,
            force: true,
          }),
        ),
        catchError((error) => {
          const currentCache = getCache(store.byProjectId(), projectId);

          patchState(store, {
            byProjectId: {
              ...store.byProjectId(),
              [projectId]: {
                ...currentCache,
                tasks: previousTasks,
              },
            },
          });

          return throwError(() => error);
        }),
      );
    },

    deleteTask(params: {
      organizationId: string;
      projectId: string;
      taskId: string;
    }): Observable<void> {
      const { organizationId, projectId, taskId } = params;

      return tasksService.deleteTask(organizationId, projectId, taskId).pipe(
        tap(() => {
          const cache = getCache(store.byProjectId(), projectId);
          const hadTask = cache.tasks.some((entry) => entry.id === taskId);

          if (!hadTask) {
            return;
          }

          patchState(store, {
            byProjectId: {
              ...store.byProjectId(),
              [projectId]: {
                ...cache,
                tasks: cache.tasks.filter((entry) => entry.id !== taskId),
                meta: {
                  ...cache.meta,
                  total: Math.max(0, cache.meta.total - 1),
                },
              },
            },
          });
        }),
        map(() => undefined),
      );
    },
  })),
);
