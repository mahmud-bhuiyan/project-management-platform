import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { NotificationsStore } from '../../../core/state/notifications.store';
import { NotificationBellComponent } from './notification-bell.component';

const notification = {
  id: 'notification-1',
  userId: 'user-1',
  type: 'TASK_ASSIGNED',
  title: 'Task assigned to you',
  body: 'You were assigned to "Design hero".',
  readAt: null,
  metadata: {
    projectId: 'project-1',
    taskId: 'task-1',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('NotificationBellComponent', () => {
  const notificationsStore = {
    notifications: signal([notification]),
    unreadCount: signal(2),
    isLoadingList: signal(false),
    listError: signal<string | null>(null),
    loadNotifications: vi.fn(() => of([notification])),
    loadUnreadCount: vi.fn(() => of(2)),
    markAsRead: vi.fn(() => of({ ...notification, readAt: '2026-01-02T00:00:00.000Z' })),
    markAllAsRead: vi.fn(() => of(2)),
  };

  beforeEach(async () => {
    notificationsStore.notifications = signal([notification]);
    notificationsStore.unreadCount = signal(2);
    notificationsStore.isLoadingList = signal(false);
    notificationsStore.listError = signal(null);

    await TestBed.configureTestingModule({
      imports: [NotificationBellComponent],
      providers: [
        provideRouter([]),
        { provide: NotificationsStore, useValue: notificationsStore },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    notificationsStore.loadNotifications.mockReturnValue(of([notification]));
    notificationsStore.loadUnreadCount.mockReturnValue(of(2));
    notificationsStore.markAsRead.mockReturnValue(
      of({ ...notification, readAt: '2026-01-02T00:00:00.000Z' }),
    );
    notificationsStore.markAllAsRead.mockReturnValue(of(2));
  });

  it('shows unread badge count', () => {
    const fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector(
      '[data-testid="notification-bell-badge"]',
    ) as HTMLElement;

    expect(badge?.textContent?.trim()).toBe('2');
  });

  it('opens dropdown and loads notifications', () => {
    const fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[data-testid="notification-bell-trigger"]')
      .click();
    fixture.detectChanges();

    expect(notificationsStore.loadNotifications).toHaveBeenCalledWith({
      force: true,
    });
    expect(
      fixture.nativeElement.querySelector('[data-testid="notification-bell-panel"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Task assigned to you');
  });

  it('marks all notifications as read', () => {
    const fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[data-testid="notification-bell-trigger"]')
      .click();
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[data-testid="notification-bell-mark-all"]')
      .click();

    expect(notificationsStore.markAllAsRead).toHaveBeenCalled();
  });
});
