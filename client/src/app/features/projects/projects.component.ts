import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  EditableProjectStatus,
  ProjectPriority,
  ProjectSummary,
} from '../../core/models/project.model';
import { OrganizationStore } from '../../core/state/organization.store';
import { ProjectsStore } from '../../core/state/projects.store';
import { canManageOrganizationMembers } from '../../core/utils/organization-role.util';
import {
  EDITABLE_PROJECT_STATUSES,
  PROJECT_PRIORITIES,
  projectPriorityLabel,
  projectStatusLabel,
  toDateInputValue,
} from '../../core/utils/project.util';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { ProjectCardComponent } from '../../shared/components/project-card/project-card.component';

type ProjectFormValue = {
  name: string;
  description: string;
  status: EditableProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  dueDate: string;
};

@Component({
  selector: 'app-projects',
  imports: [
    ReactiveFormsModule,
    PageHeroComponent,
    ProjectCardComponent,
    EmptyStateComponent,
    ModalComponent,
  ],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsComponent {
  private readonly organizationStore = inject(OrganizationStore);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly statusOptions = EDITABLE_PROJECT_STATUSES;
  protected readonly priorityOptions = PROJECT_PRIORITIES;

  protected readonly activeOrganization = this.organizationStore.activeOrganization;
  protected readonly projects = this.projectsStore.projects;
  protected readonly projectsError = this.projectsStore.projectsError;

  protected readonly canManage = computed(() => {
    const role = this.activeOrganization()?.role;
    return role ? canManageOrganizationMembers(role) : false;
  });

  protected readonly isInitialLoad = computed(
    () =>
      this.projectsStore.isLoading() &&
      !this.projectsStore.hasLoaded() &&
      this.projects().length === 0,
  );

  protected readonly showEmptyState = computed(
    () =>
      !!this.activeOrganization() &&
      this.projectsStore.hasLoaded() &&
      this.projects().length === 0 &&
      !this.projectsError(),
  );

  protected readonly projectModalMode = signal<'create' | 'edit' | null>(null);
  protected readonly editingProject = signal<ProjectSummary | null>(null);
  protected readonly isSubmittingProject = signal(false);
  protected readonly projectFormError = signal<string | null>(null);

  protected readonly isProjectModalOpen = computed(
    () => this.projectModalMode() !== null,
  );

  protected readonly projectModalTitle = computed(() =>
    this.projectModalMode() === 'edit' ? 'Edit project' : 'Create project',
  );

  protected readonly projectModalDescription = computed(() =>
    this.projectModalMode() === 'edit'
      ? 'Update project details for your organization.'
      : 'Add a new delivery project to this organization.',
  );

  protected readonly projectForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(5000)]],
    status: this.formBuilder.control<EditableProjectStatus>('PLANNING'),
    priority: this.formBuilder.control<ProjectPriority>('MEDIUM'),
    startDate: [''],
    dueDate: [''],
  });

  protected statusLabel(status: EditableProjectStatus): string {
    return projectStatusLabel(status);
  }

  protected priorityLabel(priority: ProjectPriority): string {
    return projectPriorityLabel(priority);
  }

  protected canEditProject(project: ProjectSummary): boolean {
    return this.canManage() && project.status !== 'ARCHIVED';
  }

  protected hasProjectFormError(
    controlName: keyof ProjectFormValue,
    errorCode: string,
  ): boolean {
    const control = this.projectForm.controls[controlName];
    return control.touched && control.hasError(errorCode);
  }

  protected openCreateProjectModal(): void {
    this.projectFormError.set(null);
    this.editingProject.set(null);
    this.projectModalMode.set('create');
    this.projectForm.reset({
      name: '',
      description: '',
      status: 'PLANNING',
      priority: 'MEDIUM',
      startDate: '',
      dueDate: '',
    });
  }

  protected openEditProjectModal(project: ProjectSummary): void {
    if (!this.canEditProject(project)) {
      return;
    }

    this.projectFormError.set(null);
    this.editingProject.set(project);
    this.projectModalMode.set('edit');
    this.projectForm.reset({
      name: project.name,
      description: project.description ?? '',
      status:
        project.status === 'ARCHIVED'
          ? 'PLANNING'
          : project.status,
      priority: project.priority,
      startDate: toDateInputValue(project.startDate),
      dueDate: toDateInputValue(project.dueDate),
    });
  }

  protected closeProjectModal(): void {
    if (this.isSubmittingProject()) {
      return;
    }

    this.projectModalMode.set(null);
    this.editingProject.set(null);
    this.projectFormError.set(null);
  }

  protected submitProjectForm(): void {
    if (!this.canManage() || this.projectForm.invalid || this.isSubmittingProject()) {
      this.projectForm.markAllAsTouched();
      return;
    }

    const organization = this.activeOrganization();
    if (!organization) {
      return;
    }

    const mode = this.projectModalMode();
    if (!mode) {
      return;
    }

    const { name, description, status, priority, startDate, dueDate } =
      this.projectForm.getRawValue();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    this.isSubmittingProject.set(true);
    this.projectFormError.set(null);

    if (mode === 'create') {
      this.projectsStore
        .createProject({
          organizationId: organization.id,
          input: {
            name: trimmedName,
            description: trimmedDescription || undefined,
            status,
            priority,
            startDate: startDate || undefined,
            dueDate: dueDate || undefined,
          },
        })
        .pipe(finalize(() => this.isSubmittingProject.set(false)))
        .subscribe({
          next: () => {
            this.projectModalMode.set(null);
            this.editingProject.set(null);
            this.projectFormError.set(null);
          },
          error: (error: HttpErrorResponse) => {
            this.projectFormError.set(this.extractErrorMessage(error));
          },
        });
      return;
    }

    const project = this.editingProject();
    if (!project) {
      this.isSubmittingProject.set(false);
      return;
    }

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
      .pipe(finalize(() => this.isSubmittingProject.set(false)))
      .subscribe({
        next: () => {
          this.projectModalMode.set(null);
          this.editingProject.set(null);
          this.projectFormError.set(null);
        },
        error: (error: HttpErrorResponse) => {
          this.projectFormError.set(this.extractErrorMessage(error));
        },
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
