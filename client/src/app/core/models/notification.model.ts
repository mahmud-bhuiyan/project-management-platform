export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'MENTION'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_DUE_SOON';

export type NotificationSummary = {
  id: string;
  userId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  readAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type NotificationsResponseData = {
  notifications: NotificationSummary[];
};

export type UnreadCountResponseData = {
  unreadCount: number;
};

export type NotificationResponseData = {
  notification: NotificationSummary;
};

export type MarkAllReadResponseData = {
  updatedCount: number;
};
