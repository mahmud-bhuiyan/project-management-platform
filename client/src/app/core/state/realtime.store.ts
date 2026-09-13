import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Subscription } from 'rxjs';
import { RealtimeService } from '../services/realtime.service';
import { AuthStore } from './auth.store';
import { NotificationsStore } from './notifications.store';
import { TaskDetailStore } from './task-detail.store';
import { TasksStore } from './tasks.store';

type RealtimeState = {
  isConnected: boolean;
};

export const RealtimeStore = signalStore(
  { providedIn: 'root' },
  withState<RealtimeState>({
    isConnected: false,
  }),
  withMethods((store) => {
    const authStore = inject(AuthStore);
    const realtimeService = inject(RealtimeService);
    const tasksStore = inject(TasksStore);
    const taskDetailStore = inject(TaskDetailStore);
    const notificationsStore = inject(NotificationsStore);

    let listeners: Subscription | null = null;

    const bindListeners = () => {
      listeners?.unsubscribe();

      listeners = new Subscription();

      listeners.add(
        realtimeService.onTaskReordered().subscribe((event) => {
          tasksStore.applyRemoteTaskReorder({
            organizationId: event.organizationId,
            projectId: event.projectId,
          });
        }),
      );

      listeners.add(
        realtimeService.onCommentCreated().subscribe((event) => {
          taskDetailStore.applyRemoteComment({
            organizationId: event.organizationId,
            projectId: event.projectId,
            taskId: event.taskId,
            comment: event.comment,
          });
        }),
      );

      listeners.add(
        realtimeService.onNotificationCreated().subscribe((event) => {
          notificationsStore.applyRemoteNotification(event.notification);
        }),
      );
    };

    return {
      connect(): void {
        const token = authStore.getAccessToken();
        if (!token) {
          return;
        }

        realtimeService.connect(token);
        bindListeners();
        patchState(store, { isConnected: true });
      },

      disconnect(): void {
        listeners?.unsubscribe();
        listeners = null;
        realtimeService.disconnect();
        patchState(store, { isConnected: false });
      },

      joinProject(organizationId: string, projectId: string): void {
        if (!store.isConnected()) {
          this.connect();
        }

        realtimeService.joinProject(organizationId, projectId);
      },

      leaveProject(organizationId: string, projectId: string): void {
        realtimeService.leaveProject(organizationId, projectId);
      },
    };
  }),
);
