import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { TaskStatus } from '../../../core/models/task.model';
import {
  taskStatusBadgeTone,
  taskStatusLabel,
} from '../../../core/utils/task.util';

@Component({
  selector: 'app-task-status-badge',
  templateUrl: './task-status-badge.component.html',
  styleUrl: './task-status-badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskStatusBadgeComponent {
  readonly status = input.required<TaskStatus>();

  protected readonly label = computed(() => taskStatusLabel(this.status()));
  protected readonly toneClass = computed(
    () => `project-badge--${taskStatusBadgeTone(this.status())}`,
  );
}
