import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiSuccessResponse } from '../models/api-response.model';
import type {
  CreateSubtaskInput,
  SubtaskResponseData,
  SubtaskSummary,
  SubtasksResponseData,
  UpdateSubtaskInput,
} from '../models/task-detail.model';

@Injectable({ providedIn: 'root' })
export class SubtasksService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listSubtasks(
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Observable<SubtaskSummary[]> {
    return this.http
      .get<ApiSuccessResponse<SubtasksResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/subtasks`,
      )
      .pipe(map((response) => response.data.subtasks));
  }

  createSubtask(
    organizationId: string,
    projectId: string,
    taskId: string,
    input: CreateSubtaskInput,
  ): Observable<SubtaskSummary> {
    return this.http
      .post<ApiSuccessResponse<SubtaskResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/subtasks`,
        input,
      )
      .pipe(map((response) => response.data.subtask));
  }

  updateSubtask(
    organizationId: string,
    projectId: string,
    taskId: string,
    subtaskId: string,
    input: UpdateSubtaskInput,
  ): Observable<SubtaskSummary> {
    return this.http
      .patch<ApiSuccessResponse<SubtaskResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`,
        input,
      )
      .pipe(map((response) => response.data.subtask));
  }

  deleteSubtask(
    organizationId: string,
    projectId: string,
    taskId: string,
    subtaskId: string,
  ): Observable<void> {
    return this.http
      .delete<ApiSuccessResponse<null>>(
        `${this.apiUrl}/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`,
      )
      .pipe(map(() => undefined));
  }
}
