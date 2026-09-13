import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type {
  EditableProjectStatus,
  ProjectPriority,
} from '../../../core/models/project.model';
import {
  EDITABLE_PROJECT_STATUSES,
  PROJECT_PRIORITIES,
  projectPriorityLabel,
  projectStatusLabel,
} from '../../../core/utils/project.util';

@Component({
  selector: 'app-project-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './project-form.component.html',
  styleUrl: './project-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectFormComponent {
  readonly form = input.required<FormGroup>();
  readonly isSubmitting = input(false);
  readonly formError = input<string | null>(null);
  readonly submitLabel = input('Save changes');
  readonly submittingLabel = input('Saving…');
  readonly cancelLink = input<string | readonly string[]>(['/projects']);

  readonly submitted = output<void>();

  protected readonly statusOptions = EDITABLE_PROJECT_STATUSES;
  protected readonly priorityOptions = PROJECT_PRIORITIES;

  protected statusLabel(status: EditableProjectStatus): string {
    return projectStatusLabel(status);
  }

  protected priorityLabel(priority: ProjectPriority): string {
    return projectPriorityLabel(priority);
  }

  protected hasError(controlName: string, errorCode: string): boolean {
    const control = this.form().get(controlName);
    return !!control && control.touched && control.hasError(errorCode);
  }

  protected onSubmit(): void {
    this.submitted.emit();
  }
}
