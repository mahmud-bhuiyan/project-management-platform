import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { ProjectMember } from '../../../core/models/project.model';
import type { TaskPriority, TaskStatus } from '../../../core/models/task.model';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  taskPriorityLabel,
  taskStatusLabel,
} from '../../../core/utils/task.util';

@Component({
  selector: 'app-task-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFormComponent {
  readonly form = input.required<FormGroup>();
  readonly assigneeOptions = input<ProjectMember[]>([]);
  readonly isSubmitting = input(false);
  readonly formError = input<string | null>(null);
  readonly submitLabel = input('Save changes');
  readonly submittingLabel = input('Saving…');
  readonly cancelLink = input<string | readonly string[]>(['/projects']);

  readonly submitted = output<void>();

  protected readonly statusOptions = TASK_STATUSES;
  protected readonly priorityOptions = TASK_PRIORITIES;

  protected statusLabel(status: TaskStatus): string {
    return taskStatusLabel(status);
  }

  protected priorityLabel(priority: TaskPriority): string {
    return taskPriorityLabel(priority);
  }

  protected hasError(controlName: string, errorCode: string): boolean {
    const control = this.form().get(controlName);
    return !!control && control.touched && control.hasError(errorCode);
  }

  protected onSubmit(): void {
    this.submitted.emit();
  }
}
