import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
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
import type { TaskStatus, TaskSummary } from '../../../core/models/task.model';
import { OrganizationStore } from '../../../core/state/organization.store';
import { ProjectsStore } from '../../../core/state/projects.store';
import { RealtimeStore } from '../../../core/state/realtime.store';
import { TasksStore } from '../../../core/state/tasks.store';
import {
  TASK_STATUSES,
  flattenColumnTasks,
  groupTasksByStatus,
  taskStatusLabel,
} from '../../../core/utils/task.util';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { ProjectPriorityBadgeComponent } from '../../../shared/components/project-priority-badge/project-priority-badge.component';
import { ProjectStatusBadgeComponent } from '../../../shared/components/project-status-badge/project-status-badge.component';
import { TaskPriorityBadgeComponent } from '../../../shared/components/task-priority-badge/task-priority-badge.component';

const ALL_TASKS_LIMIT = 100;

type ColumnTasks = Record<TaskStatus, TaskSummary[]>;

function cloneColumnTasks(columns: ColumnTasks): ColumnTasks {
  return Object.fromEntries(
    TASK_STATUSES.map((status) => [status, [...columns[status]]]),
  ) as ColumnTasks;
}

@Component({
  selector: 'app-kanban-board',
  imports: [
    RouterLink,
    PageHeroComponent,
    ProjectStatusBadgeComponent,
    ProjectPriorityBadgeComponent,
    TaskPriorityBadgeComponent,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragPlaceholder,
  ],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanBoardComponent {
  private readonly organizationStore = inject(OrganizationStore);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly tasksStore = inject(TasksStore);
  private readonly realtimeStore = inject(RealtimeStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly columns = TASK_STATUSES;
  protected readonly taskStatusLabel = taskStatusLabel;

  protected readonly activeOrganization = this.organizationStore.activeOrganization;

  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  private readonly projectId = computed(() => this.routeParams()?.get('projectId') ?? '');

  protected readonly project = computed(() => {
    const id = this.projectId();
    return this.projectsStore.projects().find((entry) => entry.id === id) ?? null;
  });

  protected readonly isProjectMissing = computed(
    () => this.projectsStore.hasLoaded() && this.project() === null,
  );

  protected readonly canManageTasks = computed(() => {
    const role = this.activeOrganization()?.role;
    const project = this.project();
    return !!role && role !== 'VIEWER' && project !== null && project.status !== 'ARCHIVED';
  });

  protected readonly tasksError = computed(() =>
    this.tasksStore.projectTasksError(this.projectId()),
  );

  protected readonly isLoadingTasks = computed(() =>
    this.tasksStore.isLoadingProjectTasks(this.projectId()),
  );

  protected readonly columnTasks = signal<ColumnTasks>(
    groupTasksByStatus([]),
  );

  protected readonly reorderError = signal<string | null>(null);
  protected readonly isReordering = signal(false);

  constructor() {
    effect((onCleanup) => {
      const organization = this.activeOrganization();
      const project = this.project();
      const projectId = this.projectId();

      if (!organization || !project || !projectId) {
        return;
      }

      this.realtimeStore.joinProject(organization.id, projectId);

      const subscription = this.tasksStore
        .loadTasks({
          organizationId: organization.id,
          projectId,
          query: { page: 1, limit: ALL_TASKS_LIMIT },
          silent: false,
        })
        .subscribe();

      onCleanup(() => {
        subscription.unsubscribe();
        this.realtimeStore.leaveProject(organization.id, projectId);
      });
    });

    effect(() => {
      const projectId = this.projectId();
      const tasks = this.tasksStore.projectTasks(projectId);

      untracked(() => {
        this.columnTasks.set(groupTasksByStatus(tasks));
      });
    });
  }

  protected onTaskDrop(event: CdkDragDrop<TaskSummary[]>): void {
    if (!this.canManageTasks() || this.isReordering()) {
      return;
    }

    const targetStatus = event.container.id as TaskStatus;
    const sourceStatus = event.previousContainer.id as TaskStatus;
    const nextColumns = cloneColumnTasks(this.columnTasks());
    const sourceTasks = nextColumns[sourceStatus];
    const targetTasks =
      sourceStatus === targetStatus ? sourceTasks : nextColumns[targetStatus];

    if (event.previousContainer === event.container) {
      moveItemInArray(sourceTasks, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        sourceTasks,
        targetTasks,
        event.previousIndex,
        event.currentIndex,
      );
    }

    this.columnTasks.set(nextColumns);

    const movedTask = targetTasks[event.currentIndex];
    if (!movedTask) {
      return;
    }

    const organization = this.activeOrganization();
    const projectId = this.projectId();

    if (!organization || !projectId) {
      return;
    }

    this.reorderError.set(null);
    this.isReordering.set(true);

    this.tasksStore
      .reorderTasks({
        organizationId: organization.id,
        projectId,
        optimisticTasks: flattenColumnTasks(nextColumns),
        items: [
          {
            taskId: movedTask.id,
            status: targetStatus,
            position: event.currentIndex,
          },
        ],
      })
      .pipe(finalize(() => this.isReordering.set(false)))
      .subscribe({
        error: (error: HttpErrorResponse) => {
          this.reorderError.set(this.extractErrorMessage(error));
        },
      });
  }

  protected columnCount(status: TaskStatus): number {
    return this.columnTasks()[status].length;
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const body = error.error;

    if (body && typeof body === 'object' && 'message' in body) {
      return String(body.message);
    }

    return 'Could not save the new task order. Please try again.';
  }
}
