import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
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
  EditableProjectStatus,
  ProjectPriority,
  ProjectSummary,
} from '../../../core/models/project.model';
import { ToastService } from '../../../core/services/toast.service';
import { OrganizationStore } from '../../../core/state/organization.store';
import { ProjectsStore } from '../../../core/state/projects.store';
import { toDateInputValue } from '../../../core/utils/project.util';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { ProjectFormComponent } from '../project-form/project-form.component';

@Component({
  selector: 'app-edit-project',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeroComponent,
    ProjectFormComponent,
  ],
  templateUrl: './edit-project.component.html',
  styleUrl: './edit-project.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditProjectComponent {
  private readonly organizationStore = inject(OrganizationStore);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  protected readonly activeOrganization = this.organizationStore.activeOrganization;
  protected readonly projects = this.projectsStore.projects;
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly projectId = computed(
    () => this.routeParams()?.get('projectId') ?? '',
  );

  protected readonly backToProjectLink = computed(() => {
    const id = this.projectId();
    return id ? (['/projects', id] as const) : (['/projects'] as const);
  });

  protected readonly project = computed(() => {
    const id = this.projectId();
    return this.projects().find((entry) => entry.id === id) ?? null;
  });

  protected readonly isProjectMissing = computed(
    () => this.projectsStore.hasLoaded() && this.project() === null,
  );

  protected readonly projectForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(5000)]],
    status: this.formBuilder.control<EditableProjectStatus>('PLANNING'),
    priority: this.formBuilder.control<ProjectPriority>('MEDIUM'),
    startDate: [''],
    dueDate: [''],
  });

  constructor() {
    effect(() => {
      const project = this.project();
      this.formError.set(null);

      if (!project) {
        return;
      }

      this.patchFormFromProject(project);

      if (project.status === 'ARCHIVED') {
        this.projectForm.disable();
      } else {
        this.projectForm.enable();
      }
    });
  }

  protected submit(): void {
    if (this.projectForm.invalid || this.isSubmitting()) {
      this.projectForm.markAllAsTouched();
      return;
    }

    const organization = this.activeOrganization();
    const project = this.project();
    if (!organization || !project || project.status === 'ARCHIVED') {
      return;
    }

    const { name, description, status, priority, startDate, dueDate } =
      this.projectForm.getRawValue();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    this.isSubmitting.set(true);
    this.formError.set(null);

    this.projectsStore
      .updateProject({
        organizationId: organization.id,
        projectId: project.id,
        input: {
          name: trimmedName,
          description: trimmedDescription,
          status,
          priority,
          startDate: startDate || null,
          dueDate: dueDate || null,
        },
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success('Project updated.');
          void this.router.navigate(this.backToProjectLink());
        },
        error: (error: HttpErrorResponse) => {
          const message = this.extractErrorMessage(error);
          this.formError.set(message);
          this.toastService.error(message);
        },
      });
  }

  private patchFormFromProject(project: ProjectSummary): void {
    this.projectForm.reset({
      name: project.name,
      description: project.description ?? '',
      status: project.status === 'ARCHIVED' ? 'PLANNING' : project.status,
      priority: project.priority,
      startDate: toDateInputValue(project.startDate),
      dueDate: toDateInputValue(project.dueDate),
    });
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const body = error.error;

    if (body && typeof body === 'object' && 'message' in body) {
      return String(body.message);
    }

    return 'Something went wrong. Please try again.';
  }
}
