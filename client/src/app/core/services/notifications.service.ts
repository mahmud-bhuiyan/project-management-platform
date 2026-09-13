import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiSuccessResponse } from '../models/api-response.model';
import type {
  MarkAllReadResponseData,
  NotificationResponseData,
  NotificationSummary,
  NotificationsResponseData,
  UnreadCountResponseData,
} from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listNotifications(params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Observable<NotificationSummary[]> {
    let httpParams = new HttpParams();

    if (params?.page != null) {
      httpParams = httpParams.set('page', String(params.page));
    }

    if (params?.limit != null) {
      httpParams = httpParams.set('limit', String(params.limit));
    }

    if (params?.unreadOnly) {
      httpParams = httpParams.set('unreadOnly', 'true');
    }

    return this.http
      .get<ApiSuccessResponse<NotificationsResponseData>>(
        `${this.apiUrl}/notifications`,
        { params: httpParams },
      )
      .pipe(map((response) => response.data.notifications));
  }

  getUnreadCount(): Observable<number> {
    return this.http
      .get<ApiSuccessResponse<UnreadCountResponseData>>(
        `${this.apiUrl}/notifications/unread-count`,
      )
      .pipe(map((response) => response.data.unreadCount));
  }

  markAsRead(notificationId: string): Observable<NotificationSummary> {
    return this.http
      .patch<ApiSuccessResponse<NotificationResponseData>>(
        `${this.apiUrl}/notifications/${notificationId}/read`,
        {},
      )
      .pipe(map((response) => response.data.notification));
  }

  markAllAsRead(): Observable<number> {
    return this.http
      .patch<ApiSuccessResponse<MarkAllReadResponseData>>(
        `${this.apiUrl}/notifications/read-all`,
        {},
      )
      .pipe(map((response) => response.data.updatedCount));
  }
}
