import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import {
  RealtimeEvent,
  type CommentCreatedPayload,
  type NotificationCreatedPayload,
  type TaskReorderedPayload,
} from './realtime.events.js';
import { projectRoomId } from './utils/project-room.util.js';
import { userRoomId } from './utils/user-room.util.js';

@Injectable()
export class RealtimeEmitterService {
  private readonly logger = new Logger(RealtimeEmitterService.name);
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  emitTaskReordered(payload: TaskReorderedPayload): void {
    this.emitToProject(payload.projectId, RealtimeEvent.TaskReordered, payload);
  }

  emitCommentCreated(payload: CommentCreatedPayload): void {
    this.emitToProject(payload.projectId, RealtimeEvent.CommentCreated, payload);
  }

  emitNotificationCreated(payload: NotificationCreatedPayload): void {
    this.emitToUser(
      payload.notification.userId,
      RealtimeEvent.NotificationCreated,
      payload,
    );
  }

  private emitToProject(
    projectId: string,
    event: string,
    payload: unknown,
  ): void {
    if (!this.server) {
      this.logger.warn(`Skipped ${event} emit — gateway not ready`);
      return;
    }

    this.server.to(projectRoomId(projectId)).emit(event, payload);
  }

  private emitToUser(userId: string, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.warn(`Skipped ${event} emit — gateway not ready`);
      return;
    }

    this.server.to(userRoomId(userId)).emit(event, payload);
  }
}
