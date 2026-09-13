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
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import type {
  TaskPriority,
  TaskStatus,
  TaskSummary,
} from '../../../core/models/task.model';
import { OrganizationStore } from '../../../core/state/organization.store';
import { ProjectsStore } from '../../../core/state/projects.store';
import { TasksStore } from '../../../core/state/tasks.store';
import { toDateInputValue } from '../../../core/utils/task.util';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { TaskFormComponent } from '../task-form/task-form.component';

@Component({
  selector: 'app-edit-task',
  imports: [ReactiveFormsModule, RouterLink, PageHeroComponent, TaskFormComponent],
  templateUrl: './edit-task.component.html',
  styleUrl: './edit-task.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditTaskComponent {
  private readonly organizationStore = inject(OrganizationStore);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly tasksStore = inject(TasksStore);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly activeOrganization = this.organizationStore.activeOrganization;

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
  protected readonly isLoadingTask = signal(false);
  protected readonly loadTaskError = signal<string | null>(null);

  protected readonly assigneeOptions = computed(() =>
    this.projectsStore.projectMembers(this.projectId()),
  );

  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly taskForm = this.formBuilder.group({
    title: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(10000)]],
    status: this.formBuilder.control<TaskStatus>('BACKLOG'),
    priority: this.formBuilder.control<TaskPriority>('MEDIUM'),
    assigneeId: [''],
    dueDate: [''],
  });

  constructor() {
    effect((onCleanup) => {
      const organization = this.activeOrganization();
      const project = this.project();
      const projectId = this.projectId();
      const taskId = this.taskId();

      if (!organization || !project || !projectId || !taskId) {
        return;
      }

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

      const cached = this.tasksStore.findTask(projectId, taskId);
      if (cached) {
        this.applyTaskToForm(cached);
        return;
      }

      this.isLoadingTask.set(true);
      this.loadTaskError.set(null);

      const taskSubscription = this.tasksStore
        .loadTask({
          organizationId: organization.id,
          projectId,
          taskId,
        })
        .subscribe({
          next: (loadedTask) => {
            this.task.set(loadedTask);
            this.applyTaskToForm(loadedTask);
            this.isLoadingTask.set(false);
          },
          error: (error) => {
            this.loadTaskError.set(this.extractErrorMessage(error));
            this.isLoadingTask.set(false);
          },
        });

      onCleanup(() => taskSubscription.unsubscribe());
    });
  }

  protected submit(): void {
    this.taskForm.markAllAsTouched();

    if (this.taskForm.invalid) {
      return;
    }

    const organization = this.activeOrganization();
    const projectId = this.projectId();
    const taskId = this.taskId();

    if (!organization || !projectId || !taskId) {
      return;
    }

    const value = this.taskForm.getRawValue();
    this.isSubmitting.set(true);
    this.formError.set(null);

    this.tasksStore
      .updateTask({
        organizationId: organization.id,
        projectId,
        taskId,
        input: {
          title: value.title.trim(),
          description: value.description.trim(),
          status: value.status,
          priority: value.priority,
          assigneeId: value.assigneeId || null,
          dueDate: value.dueDate || null,
        },
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(['/projects', projectId, 'tasks', taskId]);
        },
        error: (error) => {
          this.formError.set(this.extractErrorMessage(error));
        },
      });
  }

  private applyTaskToForm(task: TaskSummary): void {
    this.taskForm.patchValue({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId ?? '',
      dueDate: toDateInputValue(task.dueDate),
    });
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (body && typeof body === 'object' && 'message' in body) {
        return String(body.message);
      }
    }

    return 'Could not save the task. Please try again.';
  }
}
