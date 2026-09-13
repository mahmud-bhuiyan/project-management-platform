import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ProjectPriority } from '../../../core/models/project.model';
import {
  projectPriorityBadgeTone,
  projectPriorityLabel,
} from '../../../core/utils/project.util';

@Component({
  selector: 'app-project-priority-badge',
  templateUrl: './project-priority-badge.component.html',
  styleUrl: './project-priority-badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectPriorityBadgeComponent {
  readonly priority = input.required<ProjectPriority>();

  protected readonly label = computed(() => projectPriorityLabel(this.priority()));
  protected readonly toneClass = computed(
    () => `project-badge--${projectPriorityBadgeTone(this.priority())}`,
  );
}
