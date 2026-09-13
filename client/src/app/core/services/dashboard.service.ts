import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiSuccessResponse } from '../models/api-response.model';
import type {
  DashboardStats,
  DashboardStatsResponseData,
} from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  loadStats(organizationId: string) {
    return this.http
      .get<ApiSuccessResponse<DashboardStatsResponseData>>(
        `${this.apiUrl}/dashboard/stats`,
        { params: { organizationId } },
      )
      .pipe(map((response) => response.data.stats));
  }
}
