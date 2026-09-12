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
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import type { CreateCompanyAdminResponseData } from '../../../core/models/auth.model';
import { PasswordInputComponent } from '../../../shared/components/password-input/password-input.component';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugifyOrganizationName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

@Component({
  selector: 'app-create-company-admin',
  imports: [ReactiveFormsModule, PasswordInputComponent],
  templateUrl: './create-company-admin.component.html',
  styleUrl: './create-company-admin.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCompanyAdminComponent {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successResult = signal<CreateCompanyAdminResponseData | null>(null);
  private slugManuallyEdited = false;

  readonly form = this.formBuilder.group({
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(255)],
    ],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    password: [
      '',
      [Validators.required, Validators.minLength(8), Validators.maxLength(72)],
    ],
    organizationName: ['', [Validators.required, Validators.maxLength(120)]],
    organizationSlug: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(80),
        Validators.pattern(SLUG_PATTERN),
      ],
    ],
  });

  onOrganizationNameInput(): void {
    if (this.slugManuallyEdited) {
      return;
    }

    const slug = slugifyOrganizationName(
      this.form.controls.organizationName.value,
    );

    this.form.controls.organizationSlug.setValue(slug, { emitEvent: false });
  }

  onOrganizationSlugInput(): void {
    this.slugManuallyEdited = true;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.authService
      .createCompanyAdmin(this.form.getRawValue())
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (result) => {
          this.successResult.set(result);
          this.slugManuallyEdited = false;
          this.form.reset();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  createAnother(): void {
    this.successResult.set(null);
    this.errorMessage.set(null);
  }

  hasError(
    field:
      | 'email'
      | 'name'
      | 'password'
      | 'organizationName'
      | 'organizationSlug',
    errorCode: string,
  ): boolean {
    const control = this.form.controls[field];
    return control.touched && control.hasError(errorCode);
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const body = error.error;

    if (body && typeof body === 'object' && 'message' in body) {
      return String(body.message);
    }

    return 'Could not create company admin. Please try again.';
  }
}
