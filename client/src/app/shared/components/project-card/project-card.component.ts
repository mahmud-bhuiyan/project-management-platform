import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ProjectSummary } from '../../../core/models/project.model';
import { formatProjectDueDate } from '../../../core/utils/project.util';
import { ProjectPriorityBadgeComponent } from '../project-priority-badge/project-priority-badge.component';
import { ProjectStatusBadgeComponent } from '../project-status-badge/project-status-badge.component';

@Component({
  selector: 'app-project-card',
  imports: [RouterLink, ProjectStatusBadgeComponent, ProjectPriorityBadgeComponent],
  templateUrl: './project-card.component.html',
  styleUrl: './project-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCardComponent {
  readonly project = input.required<ProjectSummary>();
  readonly link = input<string | readonly string[] | null>(null);
  readonly editable = input(false);
  readonly editLink = input<string | readonly string[] | null>(null);

  protected readonly descriptionPreview = computed(() => {
    const description = this.project().description?.trim();
    if (!description) {
      return null;
    }

    return description.length > 120
      ? `${description.slice(0, 117)}…`
      : description;
  });

  protected readonly dueDateLabel = computed(() =>
    formatProjectDueDate(this.project().dueDate),
  );

  protected readonly ownerInitials = computed(() => {
    const name = this.project().owner.name.trim();
    if (!name) {
      return '?';
    }

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  });
}
