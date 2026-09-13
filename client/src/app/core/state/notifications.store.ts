import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Observable, of, tap } from 'rxjs';
import type { NotificationSummary } from '../models/notification.model';
import { NotificationsService } from '../services/notifications.service';

type NotificationsState = {
  notifications: NotificationSummary[];
  unreadCount: number;
  isLoadingList: boolean;
  isLoadingUnreadCount: boolean;
  listError: string | null;
  hasLoadedList: boolean;
  hasLoadedUnreadCount: boolean;
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

export const NotificationsStore = signalStore(
  { providedIn: 'root' },
  withState<NotificationsState>({
    notifications: [],
    unreadCount: 0,
    isLoadingList: false,
    isLoadingUnreadCount: false,
    listError: null,
    hasLoadedList: false,
    hasLoadedUnreadCount: false,
  }),
  withMethods((store, notificationsService = inject(NotificationsService)) => ({
    resetForSessionClear(): void {
      patchState(store, {
        notifications: [],
        unreadCount: 0,
        isLoadingList: false,
        isLoadingUnreadCount: false,
        listError: null,
        hasLoadedList: false,
        hasLoadedUnreadCount: false,
      });
    },

    loadUnreadCount(params?: { silent?: boolean }): Observable<number> {
      const silent = params?.silent ?? false;

      if (!silent) {
        patchState(store, { isLoadingUnreadCount: true });
      }

      return notificationsService.getUnreadCount().pipe(
        tap({
          next: (unreadCount) => {
            patchState(store, {
              unreadCount,
              isLoadingUnreadCount: false,
              hasLoadedUnreadCount: true,
            });
          },
          error: () => {
            patchState(store, {
              isLoadingUnreadCount: false,
              hasLoadedUnreadCount: true,
            });
          },
        }),
      );
    },

    loadNotifications(params?: { force?: boolean }): Observable<NotificationSummary[]> {
      if (!params?.force && store.hasLoadedList()) {
        return of(store.notifications());
      }

      patchState(store, { isLoadingList: true, listError: null });

      return notificationsService.listNotifications({ page: 1, limit: 20 }).pipe(
        tap({
          next: (notifications) => {
            patchState(store, {
              notifications,
              isLoadingList: false,
              listError: null,
              hasLoadedList: true,
            });
          },
          error: (error) => {
            patchState(store, {
              isLoadingList: false,
              listError: extractErrorMessage(error),
              hasLoadedList: true,
            });
          },
        }),
      );
    },

    markAsRead(notificationId: string): Observable<NotificationSummary> {
      return notificationsService.markAsRead(notificationId).pipe(
        tap((notification) => {
          const wasUnread = store
            .notifications()
            .some((entry) => entry.id === notificationId && entry.readAt === null);

          patchState(store, {
            notifications: store.notifications().map((entry) =>
              entry.id === notification.id ? notification : entry,
            ),
            unreadCount: wasUnread
              ? Math.max(0, store.unreadCount() - 1)
              : store.unreadCount(),
          });
        }),
      );
    },

    markAllAsRead(): Observable<number> {
      return notificationsService.markAllAsRead().pipe(
        tap(() => {
          patchState(store, {
            notifications: store.notifications().map((entry) => ({
              ...entry,
              readAt: entry.readAt ?? new Date().toISOString(),
            })),
            unreadCount: 0,
          });
        }),
      );
    },
  })),
);
