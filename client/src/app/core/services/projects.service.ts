import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiSuccessResponse } from '../models/api-response.model';
import type {
  CreateProjectInput,
  ProjectResponseData,
  ProjectSummary,
  ProjectsResponseData,
  UpdateProjectInput,
} from '../models/project.model';

/** Thin HTTP facade for project endpoints — state lives in ProjectsStore. */
@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listProjects(
    organizationId: string,
    options?: { includeArchived?: boolean },
  ): Observable<ProjectSummary[]> {
    return this.http
      .get<ApiSuccessResponse<ProjectsResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/projects`,
        {
          params: options?.includeArchived
            ? { includeArchived: 'true' }
            : {},
        },
      )
      .pipe(map((response) => response.data.projects));
  }

  createProject(organizationId: string, input: CreateProjectInput) {
    return this.http
      .post<ApiSuccessResponse<ProjectResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/projects`,
        input,
      )
      .pipe(map((response) => response.data.project));
  }

  updateProject(
    organizationId: string,
    projectId: string,
    input: UpdateProjectInput,
  ) {
    return this.http
      .patch<ApiSuccessResponse<ProjectResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/projects/${projectId}`,
        input,
      )
      .pipe(map((response) => response.data.project));
  }
}
