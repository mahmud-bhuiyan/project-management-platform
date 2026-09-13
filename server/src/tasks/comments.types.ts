import type { Comment } from '@prisma/client';
import type { TaskUserSummary } from './tasks.types.js';

export type CommentResponse = Comment & {
  author: TaskUserSummary;
};

export type CreateCommentInput = {
  body: string;
};

export type UpdateCommentInput = {
  body: string;
};
