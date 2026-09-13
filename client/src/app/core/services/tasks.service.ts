import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  ApiSuccessResponse,
  PaginationMeta,
} from '../models/api-response.model';
import type {
  CreateTaskInput,
  ReorderTaskItemInput,
  ReorderTasksResponseData,
  TaskResponseData,
  TaskSummary,
  TasksQuery,
  TasksResponseData,
  UpdateTaskInput,
} from '../models/task.model';

export type ListTasksResult = {
  tasks: TaskSummary[];
  meta: PaginationMeta;
};

/** Thin HTTP facade for task endpoints — state lives in TasksStore. */
@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listTasks(
    organizationId: string,
    projectId: string,
    query: TasksQuery,
  ): Observable<ListTasksResult> {
    let params = new HttpParams()
      .set('page', String(query.page))
      .set('limit', String(query.limit));

    if (query.status) {
      params = params.set('status', query.status);
    }

    if (query.priority) {
      params = params.set('priority', query.priority);
    }

    if (query.assigneeId) {
      params = params.set('assigneeId', query.assigneeId);
    }

    if (query.search) {
      params = params.set('search', query.search);
    }

    return this.http
      .get<ApiSuccessResponse<TasksResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/projects/${projectId}/tasks`,
        { params },
      )
      .pipe(
        map((response) => ({
          tasks: response.data.tasks,
          meta: response.meta ?? {
            page: query.page,
            perPage: query.limit,
            total: response.data.tasks.length,
            totalPages: 1,
          },
        })),
      );
  }

  getTask(organizationId: string, projectId: string, taskId: string) {
    return this.http
      .get<ApiSuccessResponse<TaskResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}`,
      )
      .pipe(map((response) => response.data.task));
  }

  createTask(
    organizationId: string,
    projectId: string,
    input: CreateTaskInput,
  ) {
    return this.http
      .post<ApiSuccessResponse<TaskResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/projects/${projectId}/tasks`,
        input,
      )
      .pipe(map((response) => response.data.task));
  }

  updateTask(
    organizationId: string,
    projectId: string,
    taskId: string,
    input: UpdateTaskInput,
  ) {
    return this.http
      .patch<ApiSuccessResponse<TaskResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}`,
        input,
      )
      .pipe(map((response) => response.data.task));
  }

  deleteTask(organizationId: string, projectId: string, taskId: string) {
    return this.http.delete<ApiSuccessResponse<null>>(
      `${this.apiUrl}/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}`,
    );
  }

  reorderTasks(
    organizationId: string,
    projectId: string,
    items: ReorderTaskItemInput[],
  ) {
    return this.http
      .patch<ApiSuccessResponse<ReorderTasksResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/projects/${projectId}/tasks/reorder`,
        { items },
      )
      .pipe(map((response) => response.data.tasks));
  }
}
