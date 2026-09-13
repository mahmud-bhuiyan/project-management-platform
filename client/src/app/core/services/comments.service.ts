import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiSuccessResponse } from '../models/api-response.model';
import type {
  CommentResponseData,
  CommentSummary,
  CommentsResponseData,
  CreateCommentInput,
  UpdateCommentInput,
} from '../models/task-detail.model';

@Injectable({ providedIn: 'root' })
export class CommentsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listComments(
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Observable<CommentSummary[]> {
    return this.http
      .get<ApiSuccessResponse<CommentsResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/comments`,
      )
      .pipe(map((response) => response.data.comments));
  }

  createComment(
    organizationId: string,
    projectId: string,
    taskId: string,
    input: CreateCommentInput,
  ): Observable<CommentSummary> {
    return this.http
      .post<ApiSuccessResponse<CommentResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/comments`,
        input,
      )
      .pipe(map((response) => response.data.comment));
  }

  updateComment(
    organizationId: string,
    projectId: string,
    taskId: string,
    commentId: string,
    input: UpdateCommentInput,
  ): Observable<CommentSummary> {
    return this.http
      .patch<ApiSuccessResponse<CommentResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
        input,
      )
      .pipe(map((response) => response.data.comment));
  }

  deleteComment(
    organizationId: string,
    projectId: string,
    taskId: string,
    commentId: string,
  ): Observable<void> {
    return this.http
      .delete<ApiSuccessResponse<null>>(
        `${this.apiUrl}/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
      )
      .pipe(map(() => undefined));
  }
}
