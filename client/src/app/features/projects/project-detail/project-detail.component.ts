import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import type { TaskStatus } from '../../../core/models/task.model';
import type { TaskPriority } from '../../../core/models/task.model';
import type { TaskSummary } from '../../../core/models/task.model';
import { OrganizationStore } from '../../../core/state/organization.store';
import { ProjectsStore } from '../../../core/state/projects.store';
import { TasksStore } from '../../../core/state/tasks.store';
import { organizationRoleLabel } from '../../../core/utils/organization-role.util';
import { formatTaskDueDate } from '../../../core/utils/task.util';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { ProjectPriorityBadgeComponent } from '../../../shared/components/project-priority-badge/project-priority-badge.component';
import { ProjectStatusBadgeComponent } from '../../../shared/components/project-status-badge/project-status-badge.component';
import { TaskPriorityBadgeComponent } from '../../../shared/components/task-priority-badge/task-priority-badge.component';
import { TaskStatusBadgeComponent } from '../../../shared/components/task-status-badge/task-status-badge.component';

const ALL_TASKS_LIMIT = 100;

@Component({
  selector: 'app-project-detail',
  imports: [
    RouterLink,
    PageHeroComponent,
    ProjectStatusBadgeComponent,
    ProjectPriorityBadgeComponent,
    TaskStatusBadgeComponent,
    TaskPriorityBadgeComponent,
    ModalComponent,
  ],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailComponent {
  private readonly organizationStore = inject(OrganizationStore);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly tasksStore = inject(TasksStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly activeOrganization = this.organizationStore.activeOrganization;

  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  private readonly projectId = computed(() => this.routeParams()?.get('projectId') ?? '');

  protected readonly project = computed(() => {
    const id = this.projectId();
    return this.projectsStore.projects().find((entry) => entry.id === id) ?? null;
  });

  protected readonly members = computed(() => this.projectsStore.projectMembers(this.projectId()));

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

  protected readonly canManageTasks = computed(() => {
    const role = this.activeOrganization()?.role;
    const project = this.project();
    return !!role && role !== 'VIEWER' && project !== null && project.status !== 'ARCHIVED';
  });

  protected readonly statusFilter = signal<TaskStatus | ''>('');
  protected readonly priorityFilter = signal<TaskPriority | ''>('');
  protected readonly assigneeFilter = signal('');
  protected readonly dueFromFilter = signal('');
  protected readonly dueToFilter = signal('');
  protected readonly searchQuery = signal('');

  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debouncedSearch = signal('');

  protected readonly pendingDeleteTask = signal<TaskSummary | null>(null);
  protected readonly isDeletingTask = signal(false);
  protected readonly deleteTaskError = signal<string | null>(null);

  protected readonly isDeleteTaskModalOpen = computed(() => this.pendingDeleteTask() !== null);

  protected readonly deleteTaskModalDescription = computed(() => {
    const task = this.pendingDeleteTask();
    return task ? `Delete "${task.title}"? This action cannot be undone.` : null;
  });

  protected readonly tasks = computed(() => this.tasksStore.projectTasks(this.projectId()));

  protected readonly tasksMeta = computed(() => this.tasksStore.projectTasksMeta(this.projectId()));

  protected readonly tasksError = computed(() =>
    this.tasksStore.projectTasksError(this.projectId()),
  );

  protected readonly isLoadingTasks = computed(() =>
    this.tasksStore.isLoadingProjectTasks(this.projectId()),
  );

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

    effect((onCleanup) => {
      const organization = this.activeOrganization();
      const project = this.project();
      const projectId = this.projectId();

      if (!organization || !project || !projectId) {
        return;
      }

      const search = this.debouncedSearch().trim();
      const query = {
        page: 1,
        limit: ALL_TASKS_LIMIT,
        status: this.statusFilter() || undefined,
        priority: this.priorityFilter() || undefined,
        assigneeId: this.assigneeFilter() || undefined,
        dueFrom: this.dueFromFilter() || undefined,
        dueTo: this.dueToFilter() || undefined,
        search: search || undefined,
      };

      const subscription = this.tasksStore
        .loadTasks({
          organizationId: organization.id,
          projectId,
          query,
          silent: false,
        })
        .subscribe();

      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected onStatusFilterChange(value: string): void {
    this.statusFilter.set(value as TaskStatus | '');
  }

  protected onPriorityFilterChange(value: string): void {
    this.priorityFilter.set(value as TaskPriority | '');
  }

  protected onAssigneeFilterChange(value: string): void {
    this.assigneeFilter.set(value);
  }

  protected onDueFromFilterChange(value: string): void {
    this.dueFromFilter.set(value);
  }

  protected onDueToFilterChange(value: string): void {
    this.dueToFilter.set(value);
  }

  protected onTaskSearchChange(value: string): void {
    this.searchQuery.set(value);

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.debouncedSearch.set(value.trim());
    }, 300);
  }

  protected openDeleteTaskModal(task: TaskSummary): void {
    if (this.isDeletingTask()) {
      return;
    }

    this.deleteTaskError.set(null);
    this.pendingDeleteTask.set(task);
  }

  protected closeDeleteTaskModal(): void {
    if (this.isDeletingTask()) {
      return;
    }

    this.pendingDeleteTask.set(null);
    this.deleteTaskError.set(null);
  }

  protected confirmDeleteTask(): void {
    const task = this.pendingDeleteTask();
    const organization = this.activeOrganization();
    const projectId = this.projectId();

    if (!task || !organization || !projectId || this.isDeletingTask()) {
      return;
    }

    this.isDeletingTask.set(true);
    this.deleteTaskError.set(null);

    this.tasksStore
      .deleteTask({
        organizationId: organization.id,
        projectId,
        taskId: task.id,
      })
      .pipe(finalize(() => this.isDeletingTask.set(false)))
      .subscribe({
        next: () => {
          this.pendingDeleteTask.set(null);
        },
        error: (error: HttpErrorResponse) => {
          this.deleteTaskError.set(this.extractErrorMessage(error));
        },
      });
  }

  protected taskDueDateLabel(value: string | null): string {
    return formatTaskDueDate(value) ?? '—';
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

  private extractErrorMessage(error: HttpErrorResponse): string {
    const body = error.error;

    if (body && typeof body === 'object' && 'message' in body) {
      return String(body.message);
    }

    return 'Something went wrong. Please try again.';
  }
}
