import type { Subtask } from '@prisma/client';

export type SubtaskResponse = Subtask;

export type CreateSubtaskInput = {
  title: string;
  position?: number;
};

export type UpdateSubtaskInput = {
  title?: string;
  completed?: boolean;
  position?: number;
};
