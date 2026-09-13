import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let notificationsService: NotificationsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NotificationsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    notificationsService = TestBed.inject(NotificationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists notifications', async () => {
    const loadPromise = firstValueFrom(notificationsService.listNotifications());

    const request = httpMock.expectOne(
      'http://localhost:3001/api/v1/notifications',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      data: {
        notifications: [
          {
            id: 'notification-1',
            userId: 'user-1',
            type: 'TASK_ASSIGNED',
            title: 'Task assigned to you',
            body: 'You were assigned to "Design hero".',
            readAt: null,
            metadata: {},
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    });

    const notifications = await loadPromise;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('TASK_ASSIGNED');
  });

  it('loads unread count', async () => {
    const loadPromise = firstValueFrom(notificationsService.getUnreadCount());

    const request = httpMock.expectOne(
      'http://localhost:3001/api/v1/notifications/unread-count',
    );
    request.flush({
      success: true,
      data: { unreadCount: 3 },
    });

    await expect(loadPromise).resolves.toBe(3);
  });

  it('marks a notification as read', async () => {
    const loadPromise = firstValueFrom(
      notificationsService.markAsRead('notification-1'),
    );

    const request = httpMock.expectOne(
      'http://localhost:3001/api/v1/notifications/notification-1/read',
    );
    expect(request.request.method).toBe('PATCH');
    request.flush({
      success: true,
      data: {
        notification: {
          id: 'notification-1',
          userId: 'user-1',
          type: 'MENTION',
          title: 'You were mentioned',
          body: '@admin please review',
          readAt: '2026-01-02T00:00:00.000Z',
          metadata: {},
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
    });

    const notification = await loadPromise;
    expect(notification.readAt).not.toBeNull();
  });
});
