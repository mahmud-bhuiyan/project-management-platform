import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';
import type {
  ActivityEntry,
  CommentSummary,
  CreateCommentInput,
  CreateSubtaskInput,
  SubtaskSummary,
  UpdateCommentInput,
  UpdateSubtaskInput,
} from '../models/task-detail.model';
import { ActivityLogService } from '../services/activity-log.service';
import { CommentsService } from '../services/comments.service';
import { SubtasksService } from '../services/subtasks.service';

type TaskDetailCache = {
  subtasks: SubtaskSummary[];
  comments: CommentSummary[];
  activity: ActivityEntry[];
  error: string | null;
  hasLoaded: boolean;
};

type TaskDetailState = {
  byKey: Record<string, TaskDetailCache>;
  loadingKey: string | null;
};

function taskDetailKey(projectId: string, taskId: string): string {
  return `${projectId}:${taskId}`;
}

function defaultCache(): TaskDetailCache {
  return {
    subtasks: [],
    comments: [],
    activity: [],
    error: null,
    hasLoaded: false,
  };
}

function getCache(
  byKey: Record<string, TaskDetailCache>,
  key: string,
): TaskDetailCache {
  return byKey[key] ?? defaultCache();
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error;

    if (body && typeof body === 'object' && 'message' in body) {
      return String(body.message);
    }
  }

  return 'Something went wrong. Please try again.';
}

export const TaskDetailStore = signalStore(
  { providedIn: 'root' },
  withState<TaskDetailState>({
    byKey: {},
    loadingKey: null,
  }),
  withMethods((store) => {
    const subtasksService = inject(SubtasksService);
    const commentsService = inject(CommentsService);
    const activityLogService = inject(ActivityLogService);

    const reloadActivity = (params: {
      organizationId: string;
      projectId: string;
      taskId: string;
    }): Observable<ActivityEntry[]> => {
      const key = taskDetailKey(params.projectId, params.taskId);

      return activityLogService
        .listActivity(params.organizationId, params.projectId, params.taskId)
        .pipe(
          tap((activity) => {
            patchState(store, {
              byKey: {
                ...store.byKey(),
                [key]: {
                  ...getCache(store.byKey(), key),
                  activity,
                },
              },
            });
          }),
        );
    };

    return {
      resetForOrganizationSwitch(): void {
        patchState(store, {
          byKey: {},
          loadingKey: null,
        });
      },

      subtasks(projectId: string, taskId: string): SubtaskSummary[] {
        return getCache(store.byKey(), taskDetailKey(projectId, taskId)).subtasks;
      },

      comments(projectId: string, taskId: string): CommentSummary[] {
        return getCache(store.byKey(), taskDetailKey(projectId, taskId)).comments;
      },

      activity(projectId: string, taskId: string): ActivityEntry[] {
        return getCache(store.byKey(), taskDetailKey(projectId, taskId)).activity;
      },

      detailError(projectId: string, taskId: string): string | null {
        return getCache(store.byKey(), taskDetailKey(projectId, taskId)).error;
      },

      isDetailLoaded(projectId: string, taskId: string): boolean {
        return getCache(store.byKey(), taskDetailKey(projectId, taskId)).hasLoaded;
      },

      isLoadingDetail(projectId: string, taskId: string): boolean {
        return store.loadingKey() === taskDetailKey(projectId, taskId);
      },

      loadDetail(params: {
        organizationId: string;
        projectId: string;
        taskId: string;
        force?: boolean;
      }): Observable<void> {
        const key = taskDetailKey(params.projectId, params.taskId);
        const existing = getCache(store.byKey(), key);

        if (!params.force && existing.hasLoaded) {
          return of(undefined);
        }

        patchState(store, { loadingKey: key });

        return forkJoin({
          subtasks: subtasksService.listSubtasks(
            params.organizationId,
            params.projectId,
            params.taskId,
          ),
          comments: commentsService.listComments(
            params.organizationId,
            params.projectId,
            params.taskId,
          ),
          activity: activityLogService.listActivity(
            params.organizationId,
            params.projectId,
            params.taskId,
          ),
        }).pipe(
          tap({
            next: ({ subtasks, comments, activity }) => {
              patchState(store, {
                loadingKey: null,
                byKey: {
                  ...store.byKey(),
                  [key]: {
                    subtasks,
                    comments,
                    activity,
                    error: null,
                    hasLoaded: true,
                  },
                },
              });
            },
            error: (error) => {
              patchState(store, {
                loadingKey: null,
                byKey: {
                  ...store.byKey(),
                  [key]: {
                    ...defaultCache(),
                    error: extractErrorMessage(error),
                    hasLoaded: true,
                  },
                },
              });
            },
          }),
          map(() => undefined),
        );
      },

      createSubtask(params: {
        organizationId: string;
        projectId: string;
        taskId: string;
        input: CreateSubtaskInput;
      }): Observable<SubtaskSummary> {
        const key = taskDetailKey(params.projectId, params.taskId);

        return subtasksService
          .createSubtask(
            params.organizationId,
            params.projectId,
            params.taskId,
            params.input,
          )
          .pipe(
            tap((subtask) => {
              const cache = getCache(store.byKey(), key);
              patchState(store, {
                byKey: {
                  ...store.byKey(),
                  [key]: {
                    ...cache,
                    subtasks: [...cache.subtasks, subtask],
                  },
                },
              });
            }),
          );
      },

      updateSubtask(params: {
        organizationId: string;
        projectId: string;
        taskId: string;
        subtaskId: string;
        input: UpdateSubtaskInput;
      }): Observable<SubtaskSummary> {
        const key = taskDetailKey(params.projectId, params.taskId);

        return subtasksService
          .updateSubtask(
            params.organizationId,
            params.projectId,
            params.taskId,
            params.subtaskId,
            params.input,
          )
          .pipe(
            switchMap((subtask) =>
              reloadActivity(params).pipe(map(() => subtask)),
            ),
            tap((subtask) => {
              const cache = getCache(store.byKey(), key);
              patchState(store, {
                byKey: {
                  ...store.byKey(),
                  [key]: {
                    ...cache,
                    subtasks: cache.subtasks.map((entry) =>
                      entry.id === subtask.id ? subtask : entry,
                    ),
                  },
                },
              });
            }),
          );
      },

      deleteSubtask(params: {
        organizationId: string;
        projectId: string;
        taskId: string;
        subtaskId: string;
      }): Observable<void> {
        const key = taskDetailKey(params.projectId, params.taskId);

        return subtasksService
          .deleteSubtask(
            params.organizationId,
            params.projectId,
            params.taskId,
            params.subtaskId,
          )
          .pipe(
            tap(() => {
              const cache = getCache(store.byKey(), key);
              patchState(store, {
                byKey: {
                  ...store.byKey(),
                  [key]: {
                    ...cache,
                    subtasks: cache.subtasks.filter(
                      (entry) => entry.id !== params.subtaskId,
                    ),
                  },
                },
              });
            }),
            map(() => undefined),
          );
      },

      createComment(params: {
        organizationId: string;
        projectId: string;
        taskId: string;
        input: CreateCommentInput;
      }): Observable<CommentSummary> {
        const key = taskDetailKey(params.projectId, params.taskId);

        return commentsService
          .createComment(
            params.organizationId,
            params.projectId,
            params.taskId,
            params.input,
          )
          .pipe(
            switchMap((comment) =>
              reloadActivity(params).pipe(map(() => comment)),
            ),
            tap((comment) => {
              const cache = getCache(store.byKey(), key);
              patchState(store, {
                byKey: {
                  ...store.byKey(),
                  [key]: {
                    ...cache,
                    comments: [...cache.comments, comment],
                  },
                },
              });
            }),
          );
      },

      updateComment(params: {
        organizationId: string;
        projectId: string;
        taskId: string;
        commentId: string;
        input: UpdateCommentInput;
      }): Observable<CommentSummary> {
        const key = taskDetailKey(params.projectId, params.taskId);

        return commentsService
          .updateComment(
            params.organizationId,
            params.projectId,
            params.taskId,
            params.commentId,
            params.input,
          )
          .pipe(
            tap((comment) => {
              const cache = getCache(store.byKey(), key);
              patchState(store, {
                byKey: {
                  ...store.byKey(),
                  [key]: {
                    ...cache,
                    comments: cache.comments.map((entry) =>
                      entry.id === comment.id ? comment : entry,
                    ),
                  },
                },
              });
            }),
          );
      },

      applyRemoteComment(params: {
        organizationId: string;
        projectId: string;
        taskId: string;
        comment: CommentSummary;
      }): void {
        const key = taskDetailKey(params.projectId, params.taskId);
        const cache = getCache(store.byKey(), key);

        if (!cache.hasLoaded) {
          return;
        }

        if (cache.comments.some((entry) => entry.id === params.comment.id)) {
          return;
        }

        patchState(store, {
          byKey: {
            ...store.byKey(),
            [key]: {
              ...cache,
              comments: [...cache.comments, params.comment],
            },
          },
        });
      },

      deleteComment(params: {
        organizationId: string;
        projectId: string;
        taskId: string;
        commentId: string;
      }): Observable<void> {
        const key = taskDetailKey(params.projectId, params.taskId);

        return commentsService
          .deleteComment(
            params.organizationId,
            params.projectId,
            params.taskId,
            params.commentId,
          )
          .pipe(
            tap(() => {
              const cache = getCache(store.byKey(), key);
              patchState(store, {
                byKey: {
                  ...store.byKey(),
                  [key]: {
                    ...cache,
                    comments: cache.comments.filter(
                      (entry) => entry.id !== params.commentId,
                    ),
                  },
                },
              });
            }),
            map(() => undefined),
          );
      },
    };
  }),
);
