import { Injectable, NgZone, inject } from '@angular/core';
import { io, type Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { normalizeSocketUrl } from '../utils/socket-url.util';
import {
  RealtimeEvent,
  type CommentCreatedEvent,
  type NotificationCreatedEvent,
  type TaskReorderedEvent,
} from '../models/realtime.model';

type ProjectRoomKey = `${string}:${string}`;

type ProjectRoomRef = {
  organizationId: string;
  projectId: string;
};

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly ngZone = inject(NgZone);
  private socket: Socket | null = null;
  private connectedToken: string | null = null;
  private readonly joinedProjects = new Set<ProjectRoomKey>();
  private readonly pendingJoins = new Map<ProjectRoomKey, ProjectRoomRef>();
  private readonly taskReorderedSubject = new Subject<TaskReorderedEvent>();
  private readonly commentCreatedSubject = new Subject<CommentCreatedEvent>();
  private readonly notificationCreatedSubject =
    new Subject<NotificationCreatedEvent>();

  connect(accessToken: string): void {
    if (this.socket?.connected && this.connectedToken === accessToken) {
      return;
    }

    this.disconnect();
    this.connectedToken = accessToken;

    this.socket = io(normalizeSocketUrl(environment.wsUrl), {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      for (const ref of this.pendingJoins.values()) {
        this.emitJoin(ref.organizationId, ref.projectId);
      }
    });

    this.socket.on(RealtimeEvent.TaskReordered, (payload: TaskReorderedEvent) => {
      this.ngZone.run(() => {
        this.taskReorderedSubject.next(payload);
      });
    });

    this.socket.on(RealtimeEvent.CommentCreated, (payload: CommentCreatedEvent) => {
      this.ngZone.run(() => {
        this.commentCreatedSubject.next(payload);
      });
    });

    this.socket.on(
      RealtimeEvent.NotificationCreated,
      (payload: NotificationCreatedEvent) => {
        this.ngZone.run(() => {
          this.notificationCreatedSubject.next(payload);
        });
      },
    );
  }

  disconnect(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.connectedToken = null;
    this.joinedProjects.clear();
    this.pendingJoins.clear();
  }

  joinProject(organizationId: string, projectId: string): void {
    const key = `${organizationId}:${projectId}` as ProjectRoomKey;

    if (this.joinedProjects.has(key)) {
      return;
    }

    this.pendingJoins.set(key, { organizationId, projectId });

    if (this.socket?.connected) {
      this.emitJoin(organizationId, projectId);
    }
  }

  leaveProject(organizationId: string, projectId: string): void {
    const key = `${organizationId}:${projectId}` as ProjectRoomKey;
    this.pendingJoins.delete(key);

    if (!this.socket?.connected || !this.joinedProjects.has(key)) {
      return;
    }

    this.socket.emit(
      'project:leave',
      { organizationId, projectId },
      (ack: { ok?: boolean }) => {
        if (ack?.ok) {
          this.joinedProjects.delete(key);
        }
      },
    );
  }

  private emitJoin(organizationId: string, projectId: string): void {
    const key = `${organizationId}:${projectId}` as ProjectRoomKey;

    if (!this.socket?.connected || this.joinedProjects.has(key)) {
      return;
    }

    this.socket.emit(
      'project:join',
      { organizationId, projectId },
      (ack: { ok?: boolean }) => {
        if (ack?.ok) {
          this.joinedProjects.add(key);
          this.pendingJoins.delete(key);
        }
      },
    );
  }

  onTaskReordered(): Observable<TaskReorderedEvent> {
    return this.taskReorderedSubject.asObservable();
  }

  onCommentCreated(): Observable<CommentCreatedEvent> {
    return this.commentCreatedSubject.asObservable();
  }

  onNotificationCreated(): Observable<NotificationCreatedEvent> {
    return this.notificationCreatedSubject.asObservable();
  }
}
