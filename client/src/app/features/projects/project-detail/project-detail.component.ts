import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrganizationStore } from '../../../core/state/organization.store';
import { ProjectsStore } from '../../../core/state/projects.store';
import { canManageOrganizationMembers } from '../../../core/utils/organization-role.util';
import {
  formatProjectDueDate,
  projectPriorityLabel,
  projectStatusLabel,
} from '../../../core/utils/project.util';
import { organizationRoleLabel } from '../../../core/utils/organization-role.util';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { ProjectPriorityBadgeComponent } from '../../../shared/components/project-priority-badge/project-priority-badge.component';
import { ProjectStatusBadgeComponent } from '../../../shared/components/project-status-badge/project-status-badge.component';

@Component({
  selector: 'app-project-detail',
  imports: [
    DatePipe,
    RouterLink,
    PageHeroComponent,
    ProjectStatusBadgeComponent,
    ProjectPriorityBadgeComponent,
  ],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailComponent {
  private readonly organizationStore = inject(OrganizationStore);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly activeOrganization = this.organizationStore.activeOrganization;

  private readonly projectId = computed(
    () => this.route.snapshot.paramMap.get('projectId') ?? '',
  );

  protected readonly project = computed(() => {
    const id = this.projectId();
    return this.projectsStore.projects().find((entry) => entry.id === id) ?? null;
  });

  protected readonly members = computed(() =>
    this.projectsStore.projectMembers(this.projectId()),
  );

  protected readonly membersError = computed(
    () => this.projectsStore.membersErrorByProjectId()[this.projectId()] ?? null,
  );

  protected readonly isLoadingMembers = computed(
    () =>
      this.projectsStore.membersLoadingProjectId() === this.projectId() &&
      this.members().length === 0 &&
      !this.projectsStore.isProjectMembersLoaded(this.projectId()),
  );

  protected readonly isProjectMissing = computed(
    () => this.projectsStore.hasLoaded() && this.project() === null,
  );

  protected readonly canManage = computed(() => {
    const role = this.activeOrganization()?.role;
    return role ? canManageOrganizationMembers(role) : false;
  });

  protected readonly canEdit = computed(() => {
    const project = this.project();
    return this.canManage() && project !== null && project.status !== 'ARCHIVED';
  });

  constructor() {
    effect((onCleanup) => {
      const organization = this.activeOrganization();
      const project = this.project();
      const projectId = this.projectId();

      if (!organization || !project || !projectId) {
        return;
      }

      if (untracked(() => this.projectsStore.isProjectMembersLoaded(projectId))) {
        return;
      }

      const subscription = this.projectsStore
        .loadProjectMembers({
          organizationId: organization.id,
          projectId,
          silent: false,
        })
        .subscribe();

      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected statusLabel(): string {
    const project = this.project();
    return project ? projectStatusLabel(project.status) : '—';
  }

  protected priorityLabel(): string {
    const project = this.project();
    return project ? projectPriorityLabel(project.priority) : '—';
  }

  protected formatDate(value: string | null): string {
    return value ? (formatProjectDueDate(value) ?? '—') : '—';
  }

  protected memberInitials(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) {
      return '?';
    }

    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  protected roleLabel(role: Parameters<typeof organizationRoleLabel>[0]): string {
    return organizationRoleLabel(role);
  }
}
