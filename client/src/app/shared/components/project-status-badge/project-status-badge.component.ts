import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ProjectStatus } from '../../../core/models/project.model';
import {
  projectStatusBadgeTone,
  projectStatusLabel,
} from '../../../core/utils/project.util';

@Component({
  selector: 'app-project-status-badge',
  templateUrl: './project-status-badge.component.html',
  styleUrl: './project-status-badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectStatusBadgeComponent {
  readonly status = input.required<ProjectStatus>();

  protected readonly label = computed(() => projectStatusLabel(this.status()));
  protected readonly toneClass = computed(
    () => `project-badge--${projectStatusBadgeTone(this.status())}`,
  );
}
