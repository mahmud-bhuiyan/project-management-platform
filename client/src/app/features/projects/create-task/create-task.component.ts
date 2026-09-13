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
import type { TaskPriority, TaskStatus } from '../../../core/models/task.model';
import { OrganizationStore } from '../../../core/state/organization.store';
import { ProjectsStore } from '../../../core/state/projects.store';
import { TasksStore } from '../../../core/state/tasks.store';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { TaskFormComponent } from '../task-form/task-form.component';

@Component({
  selector: 'app-create-task',
  imports: [ReactiveFormsModule, RouterLink, PageHeroComponent, TaskFormComponent],
  templateUrl: './create-task.component.html',
  styleUrl: './create-task.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTaskComponent {
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

  protected readonly project = computed(() => {
    const id = this.projectId();
    return this.projectsStore.projects().find((entry) => entry.id === id) ?? null;
  });

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
          silent: true,
        })
        .subscribe();

      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected submit(): void {
    this.taskForm.markAllAsTouched();

    if (this.taskForm.invalid) {
      return;
    }

    const organization = this.activeOrganization();
    const projectId = this.projectId();

    if (!organization || !projectId) {
      return;
    }

    const value = this.taskForm.getRawValue();
    this.isSubmitting.set(true);
    this.formError.set(null);

    this.tasksStore
      .createTask({
        organizationId: organization.id,
        projectId,
        input: {
          title: value.title.trim(),
          description: value.description.trim() || undefined,
          status: value.status,
          priority: value.priority,
          assigneeId: value.assigneeId || null,
          dueDate: value.dueDate || null,
        },
      })
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/projects', projectId]);
        },
        error: (error) => {
          this.formError.set(this.extractErrorMessage(error));
        },
      });
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (body && typeof body === 'object' && 'message' in body) {
        return String(body.message);
      }
    }

    return 'Could not create the task. Please try again.';
  }
}
