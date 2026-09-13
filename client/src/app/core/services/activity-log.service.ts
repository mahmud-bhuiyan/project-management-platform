import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiSuccessResponse } from '../models/api-response.model';
import type {
  ActivityEntry,
  ActivityResponseData,
} from '../models/task-detail.model';

@Injectable({ providedIn: 'root' })
export class ActivityLogService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listActivity(
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Observable<ActivityEntry[]> {
    return this.http
      .get<ApiSuccessResponse<ActivityResponseData>>(
        `${this.apiUrl}/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/activity`,
      )
      .pipe(map((response) => response.data.activity));
  }
}
