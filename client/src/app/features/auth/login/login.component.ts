import { Component, inject, OnInit, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import type { DemoPersona } from './demo-personas';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedDemoEmail = signal<string | null>(null);
  readonly demoPersonas = signal<DemoPersona[]>([]);

  protected readonly demoLoginEnabled = environment.demoLoginEnabled;

  readonly form = this.formBuilder.group({
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(255)],
    ],
    password: [
      '',
      [Validators.required, Validators.minLength(8), Validators.maxLength(72)],
    ],
  });

  ngOnInit(): void {
    if (!this.demoLoginEnabled) {
      return;
    }

    this.authService.getDemoPersonas().subscribe({
      next: (personas) => this.demoPersonas.set(personas),
      error: () => this.demoPersonas.set([]),
    });
  }

  submit(): void {
    const demoEmail = this.selectedDemoEmail();

    if (demoEmail) {
      if (this.form.controls.email.invalid) {
        this.form.controls.email.markAsTouched();
        return;
      }

      this.isSubmitting.set(true);
      this.errorMessage.set(null);

      this.authService.demoLogin(demoEmail).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          void this.router.navigate(['/dashboard']);
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.getRawValue();

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        void this.router.navigate(['/dashboard']);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.extractErrorMessage(error));
      },
    });
  }

  fillDemoPersona(persona: DemoPersona): void {
    this.selectedDemoEmail.set(persona.email);
    this.form.patchValue({ email: persona.email, password: '' });
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    this.form.markAsUntouched();
    this.errorMessage.set(null);
  }

  onEmailInput(): void {
    const email = this.form.controls.email.value;

    if (this.selectedDemoEmail() && email !== this.selectedDemoEmail()) {
      this.clearDemoPersonaMode();
    }
  }

  onPasswordInput(): void {
    if (this.selectedDemoEmail()) {
      this.clearDemoPersonaMode();
    }
  }

  hasError(field: 'email' | 'password', errorCode: string): boolean {
    const control = this.form.controls[field];
    return control.touched && control.hasError(errorCode);
  }

  private clearDemoPersonaMode(): void {
    this.selectedDemoEmail.set(null);
    this.form.controls.password.setValidators([
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(72),
    ]);
    this.form.controls.password.updateValueAndValidity();
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const body = error.error;

    if (body && typeof body === 'object' && 'message' in body) {
      return String(body.message);
    }

    return 'Login failed. Please try again.';
  }
}
