import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { TaskPriority } from '../../../core/models/task.model';
import {
  taskPriorityBadgeTone,
  taskPriorityLabel,
} from '../../../core/utils/task.util';

@Component({
  selector: 'app-task-priority-badge',
  templateUrl: './task-priority-badge.component.html',
  styleUrl: './task-priority-badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskPriorityBadgeComponent {
  readonly priority = input.required<TaskPriority>();

  protected readonly label = computed(() => taskPriorityLabel(this.priority()));
  protected readonly toneClass = computed(
    () => `project-badge--${taskPriorityBadgeTone(this.priority())}`,
  );
}
