import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import type {
  EditableProjectStatus,
  ProjectPriority,
} from '../../../core/models/project.model';
import { OrganizationStore } from '../../../core/state/organization.store';
import { ProjectsStore } from '../../../core/state/projects.store';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { ProjectFormComponent } from '../project-form/project-form.component';

@Component({
  selector: 'app-create-project',
  imports: [ReactiveFormsModule, PageHeroComponent, ProjectFormComponent],
  templateUrl: './create-project.component.html',
  styleUrl: './create-project.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateProjectComponent {
  private readonly organizationStore = inject(OrganizationStore);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);

  protected readonly activeOrganization = this.organizationStore.activeOrganization;
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly projectForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(5000)]],
    status: this.formBuilder.control<EditableProjectStatus>('PLANNING'),
    priority: this.formBuilder.control<ProjectPriority>('MEDIUM'),
    startDate: [''],
    dueDate: [''],
  });

  protected submit(): void {
    if (this.projectForm.invalid || this.isSubmitting()) {
      this.projectForm.markAllAsTouched();
      return;
    }

    const organization = this.activeOrganization();
    if (!organization) {
      return;
    }

    const { name, description, status, priority, startDate, dueDate } =
      this.projectForm.getRawValue();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    this.isSubmitting.set(true);
    this.formError.set(null);

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
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(['/projects']);
        },
        error: (error: HttpErrorResponse) => {
          this.formError.set(this.extractErrorMessage(error));
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
