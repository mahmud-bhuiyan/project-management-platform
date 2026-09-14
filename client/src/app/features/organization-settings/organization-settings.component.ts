import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';
import { OrganizationStore } from '../../core/state/organization.store';
import {
  canManageOrganizationMembers,
  organizationRoleLabel,
} from '../../core/utils/organization-role.util';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-organization-settings',
  imports: [ReactiveFormsModule, DatePipe, PageHeroComponent],
  templateUrl: './organization-settings.component.html',
  styleUrl: './organization-settings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSettingsComponent {
  private readonly organizationStore = inject(OrganizationStore);
  private readonly toastService = inject(ToastService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly activeOrganization = this.organizationStore.activeOrganization;
  protected readonly isSaving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly canEdit = computed(() => {
    const role = this.activeOrganization()?.role;
    return role ? canManageOrganizationMembers(role) : false;
  });

  protected readonly settingsForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(120)]],
  });

  constructor() {
    effect(() => {
      const organization = this.activeOrganization();
      this.saveError.set(null);

      if (!organization) {
        this.settingsForm.reset({ name: '' });
        this.settingsForm.disable();
        return;
      }

      this.settingsForm.reset({ name: organization.name });

      if (this.canEdit()) {
        this.settingsForm.enable();
      } else {
        this.settingsForm.disable();
      }
    });
  }

  protected roleLabel(): string {
    const role = this.activeOrganization()?.role;
    return role ? organizationRoleLabel(role) : '—';
  }

  protected hasError(errorCode: string): boolean {
    const control = this.settingsForm.controls.name;
    return control.touched && control.hasError(errorCode);
  }

  protected submit(): void {
    if (!this.canEdit() || this.settingsForm.invalid || this.isSaving()) {
      this.settingsForm.markAllAsTouched();
      return;
    }

    const organization = this.activeOrganization();
    if (!organization) {
      return;
    }

    const name = this.settingsForm.controls.name.value.trim();
    if (name === organization.name) {
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);

    this.organizationStore
      .updateOrganization({ organizationId: organization.id, name })
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success('Organization name updated.');
        },
        error: (error: HttpErrorResponse) => {
          const message = this.extractErrorMessage(error);
          this.saveError.set(message);
          this.toastService.error(message);
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
