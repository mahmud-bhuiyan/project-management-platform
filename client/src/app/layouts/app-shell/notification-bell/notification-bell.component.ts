import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import type { NotificationSummary } from '../../../core/models/notification.model';
import { NotificationsStore } from '../../../core/state/notifications.store';

@Component({
  selector: 'app-notification-bell',
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellComponent {
  private readonly notificationsStore = inject(NotificationsStore);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);

  protected readonly notifications = this.notificationsStore.notifications;
  protected readonly unreadCount = this.notificationsStore.unreadCount;
  protected readonly isLoadingList = this.notificationsStore.isLoadingList;
  protected readonly listError = this.notificationsStore.listError;

  protected readonly isOpen = signal(false);
  protected readonly isMarkingAll = signal(false);
  protected readonly markingReadId = signal<string | null>(null);

  protected unreadBadgeLabel(): string {
    const count = this.unreadCount();
    if (count > 99) {
      return '99+';
    }

    return String(count);
  }

  protected toggleDropdown(): void {
    const nextOpen = !this.isOpen();

    if (nextOpen) {
      this.notificationsStore.loadNotifications({ force: true }).subscribe();
      this.notificationsStore.loadUnreadCount({ silent: true }).subscribe();
    }

    this.isOpen.set(nextOpen);
  }

  protected closeDropdown(): void {
    this.isOpen.set(false);
  }

  protected markAllAsRead(): void {
    if (this.isMarkingAll() || this.unreadCount() === 0) {
      return;
    }

    this.isMarkingAll.set(true);

    this.notificationsStore
      .markAllAsRead()
      .pipe(finalize(() => this.isMarkingAll.set(false)))
      .subscribe();
  }

  protected openNotification(notification: NotificationSummary): void {
    if (this.markingReadId()) {
      return;
    }

    const navigate = () => {
      const projectId = notification.metadata['projectId'];
      const taskId = notification.metadata['taskId'];

      if (typeof projectId === 'string' && typeof taskId === 'string') {
        this.closeDropdown();
        void this.router.navigate(['/projects', projectId, 'tasks', taskId]);
      }
    };

    if (notification.readAt) {
      navigate();
      return;
    }

    this.markingReadId.set(notification.id);

    this.notificationsStore
      .markAsRead(notification.id)
      .pipe(finalize(() => this.markingReadId.set(null)))
      .subscribe({
        next: () => navigate(),
      });
  }

  protected formatTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  protected isUnread(notification: NotificationSummary): boolean {
    return notification.readAt === null;
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeDropdown();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (!this.elementRef.nativeElement.contains(target)) {
      this.closeDropdown();
    }
  }
}
