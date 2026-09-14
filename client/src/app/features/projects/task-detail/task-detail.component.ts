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
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import type { CommentSummary } from '../../../core/models/task-detail.model';
import type { TaskSummary } from '../../../core/models/task.model';
import { AuthStore } from '../../../core/state/auth.store';
import { OrganizationStore } from '../../../core/state/organization.store';
import { ProjectsStore } from '../../../core/state/projects.store';
import { RealtimeStore } from '../../../core/state/realtime.store';
import { TaskDetailStore } from '../../../core/state/task-detail.store';
import { TasksStore } from '../../../core/state/tasks.store';
import { formatActivityMessage } from '../../../core/utils/activity-message.util';
import { formatTaskDueDate } from '../../../core/utils/task.util';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { SkeletonListComponent } from '../../../shared/components/skeleton-list/skeleton-list.component';
import { TaskPriorityBadgeComponent } from '../../../shared/components/task-priority-badge/task-priority-badge.component';
import { TaskStatusBadgeComponent } from '../../../shared/components/task-status-badge/task-status-badge.component';

@Component({
  selector: 'app-task-detail',
  imports: [
    FormsModule,
    RouterLink,
    PageHeroComponent,
    TaskStatusBadgeComponent,
    TaskPriorityBadgeComponent,
    SkeletonListComponent,
  ],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskDetailComponent {
  private readonly organizationStore = inject(OrganizationStore);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly tasksStore = inject(TasksStore);
  private readonly taskDetailStore = inject(TaskDetailStore);
  private readonly realtimeStore = inject(RealtimeStore);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly activeOrganization = this.organizationStore.activeOrganization;
  protected readonly currentUser = this.authStore.currentUser;

  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly projectId = computed(
    () => this.routeParams()?.get('projectId') ?? '',
  );

  protected readonly taskId = computed(
    () => this.routeParams()?.get('taskId') ?? '',
  );

  protected readonly project = computed(() => {
    const id = this.projectId();
    return this.projectsStore.projects().find((entry) => entry.id === id) ?? null;
  });

  protected readonly task = signal<TaskSummary | null>(null);
  protected readonly loadTaskError = signal<string | null>(null);

  protected readonly subtasks = computed(() =>
    this.taskDetailStore.subtasks(this.projectId(), this.taskId()),
  );

  protected readonly comments = computed(() =>
    this.taskDetailStore.comments(this.projectId(), this.taskId()),
  );

  protected readonly activity = computed(() =>
    this.taskDetailStore.activity(this.projectId(), this.taskId()),
  );

  protected readonly detailError = computed(() =>
    this.taskDetailStore.detailError(this.projectId(), this.taskId()),
  );

  protected readonly isLoadingDetail = computed(() =>
    this.taskDetailStore.isLoadingDetail(this.projectId(), this.taskId()),
  );

  protected readonly membersById = computed(() => {
    const members = this.projectsStore.projectMembers(this.projectId());
    return new Map(members.map((member) => [member.user.id, member.user]));
  });

  protected readonly canManageTask = computed(() => {
    const role = this.activeOrganization()?.role;
    const project = this.project();
    return !!role && role !== 'VIEWER' && project !== null && project.status !== 'ARCHIVED';
  });

  protected readonly completedSubtaskCount = computed(
    () => this.subtasks().filter((entry) => entry.completed).length,
  );

  protected readonly subtaskProgressLabel = computed(() => {
    const total = this.subtasks().length;
    if (total === 0) {
      return 'No subtasks yet';
    }

    return `${this.completedSubtaskCount()} / ${total} subtasks completed`;
  });

  protected readonly subtaskProgressPercent = computed(() => {
    const total = this.subtasks().length;
    if (total === 0) {
      return 0;
    }

    return Math.round((this.completedSubtaskCount() / total) * 100);
  });

  protected readonly newSubtaskTitle = signal('');
  protected readonly isAddingSubtask = signal(false);
  protected readonly subtaskActionError = signal<string | null>(null);
  protected readonly togglingSubtaskId = signal<string | null>(null);

  protected readonly newCommentBody = signal('');
  protected readonly isSubmittingComment = signal(false);
  protected readonly commentActionError = signal<string | null>(null);

  protected readonly editingCommentId = signal<string | null>(null);
  protected readonly editingCommentBody = signal('');
  protected readonly isSavingComment = signal(false);

  constructor() {
    effect((onCleanup) => {
      const organization = this.activeOrganization();
      const project = this.project();
      const projectId = this.projectId();
      const taskId = this.taskId();

      if (!organization || !project || !projectId || !taskId) {
        return;
      }

      this.realtimeStore.joinProject(organization.id, projectId);
      onCleanup(() => this.realtimeStore.leaveProject(organization.id, projectId));

      if (untracked(() => !this.projectsStore.isProjectMembersLoaded(projectId))) {
        const membersSubscription = this.projectsStore
          .loadProjectMembers({
            organizationId: organization.id,
            projectId,
            silent: true,
          })
          .subscribe();

        onCleanup(() => membersSubscription.unsubscribe());
      }

      const cachedTask = this.tasksStore.findTask(projectId, taskId);
      if (cachedTask) {
        this.task.set(cachedTask);
        this.loadTaskError.set(null);
      } else {
        const taskSubscription = this.tasksStore
          .loadTask({
            organizationId: organization.id,
            projectId,
            taskId,
          })
          .subscribe({
            next: (loadedTask) => {
              this.task.set(loadedTask);
              this.loadTaskError.set(null);
            },
            error: (error) => {
              this.loadTaskError.set(this.extractErrorMessage(error));
            },
          });

        onCleanup(() => taskSubscription.unsubscribe());
      }

      const detailSubscription = this.taskDetailStore
        .loadDetail({
          organizationId: organization.id,
          projectId,
          taskId,
          force: untracked(() =>
            this.taskDetailStore.isDetailLoaded(projectId, taskId),
          ),
        })
        .subscribe();

      onCleanup(() => detailSubscription.unsubscribe());
    });
  }

  protected taskDueDateLabel(value: string | null): string {
    return formatTaskDueDate(value) ?? '—';
  }

  protected activityMessage(entry: Parameters<typeof formatActivityMessage>[0]): string {
    return formatActivityMessage(entry, this.membersById());
  }

  protected canEditComment(comment: CommentSummary): boolean {
    return comment.authorId === this.currentUser()?.id;
  }

  protected addSubtask(): void {
    const title = this.newSubtaskTitle().trim();
    const organization = this.activeOrganization();
    const projectId = this.projectId();
    const taskId = this.taskId();

    if (!title || !organization || !projectId || !taskId || this.isAddingSubtask()) {
      return;
    }

    this.isAddingSubtask.set(true);
    this.subtaskActionError.set(null);

    this.taskDetailStore
      .createSubtask({
        organizationId: organization.id,
        projectId,
        taskId,
        input: { title },
      })
      .pipe(finalize(() => this.isAddingSubtask.set(false)))
      .subscribe({
        next: () => {
          this.newSubtaskTitle.set('');
        },
        error: (error) => {
          this.subtaskActionError.set(this.extractErrorMessage(error));
        },
      });
  }

  protected toggleSubtask(subtaskId: string, completed: boolean): void {
    const organization = this.activeOrganization();
    const projectId = this.projectId();
    const taskId = this.taskId();

    if (!organization || !projectId || !taskId || this.togglingSubtaskId()) {
      return;
    }

    this.togglingSubtaskId.set(subtaskId);
    this.subtaskActionError.set(null);

    this.taskDetailStore
      .updateSubtask({
        organizationId: organization.id,
        projectId,
        taskId,
        subtaskId,
        input: { completed },
      })
      .pipe(finalize(() => this.togglingSubtaskId.set(null)))
      .subscribe({
        error: (error) => {
          this.subtaskActionError.set(this.extractErrorMessage(error));
        },
      });
  }

  protected submitComment(): void {
    const body = this.newCommentBody().trim();
    const organization = this.activeOrganization();
    const projectId = this.projectId();
    const taskId = this.taskId();

    if (!body || !organization || !projectId || !taskId || this.isSubmittingComment()) {
      return;
    }

    this.isSubmittingComment.set(true);
    this.commentActionError.set(null);

    this.taskDetailStore
      .createComment({
        organizationId: organization.id,
        projectId,
        taskId,
        input: { body },
      })
      .pipe(finalize(() => this.isSubmittingComment.set(false)))
      .subscribe({
        next: () => {
          this.newCommentBody.set('');
        },
        error: (error) => {
          this.commentActionError.set(this.extractErrorMessage(error));
        },
      });
  }

  protected startEditingComment(comment: CommentSummary): void {
    this.editingCommentId.set(comment.id);
    this.editingCommentBody.set(comment.body);
    this.commentActionError.set(null);
  }

  protected cancelEditingComment(): void {
    this.editingCommentId.set(null);
    this.editingCommentBody.set('');
  }

  protected saveCommentEdit(commentId: string): void {
    const body = this.editingCommentBody().trim();
    const organization = this.activeOrganization();
    const projectId = this.projectId();
    const taskId = this.taskId();

    if (!body || !organization || !projectId || !taskId || this.isSavingComment()) {
      return;
    }

    this.isSavingComment.set(true);
    this.commentActionError.set(null);

    this.taskDetailStore
      .updateComment({
        organizationId: organization.id,
        projectId,
        taskId,
        commentId,
        input: { body },
      })
      .pipe(finalize(() => this.isSavingComment.set(false)))
      .subscribe({
        next: () => {
          this.cancelEditingComment();
        },
        error: (error) => {
          this.commentActionError.set(this.extractErrorMessage(error));
        },
      });
  }

  protected deleteComment(commentId: string): void {
    const organization = this.activeOrganization();
    const projectId = this.projectId();
    const taskId = this.taskId();

    if (!organization || !projectId || !taskId || this.isSavingComment()) {
      return;
    }

    this.isSavingComment.set(true);
    this.commentActionError.set(null);

    this.taskDetailStore
      .deleteComment({
        organizationId: organization.id,
        projectId,
        taskId,
        commentId,
      })
      .pipe(finalize(() => this.isSavingComment.set(false)))
      .subscribe({
        error: (error) => {
          this.commentActionError.set(this.extractErrorMessage(error));
        },
      });
  }

  protected formatTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (body && typeof body === 'object' && 'message' in body) {
        return String(body.message);
      }
    }

    return 'Something went wrong. Please try again.';
  }
}
