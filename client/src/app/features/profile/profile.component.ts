import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/state/auth.store';
import { WorkspaceStore } from '../../core/state/workspace.store';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-profile',
  imports: [DatePipe, PageHeroComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly authStore = inject(AuthStore);
  private readonly workspaceStore = inject(WorkspaceStore);
  private readonly router = inject(Router);

  protected readonly user = this.authStore.currentUser;
  protected readonly isLoggingOut = signal(false);

  protected userInitials(): string {
    const name = this.user()?.name?.trim();

    if (!name) {
      return '?';
    }

    const parts = name.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  protected platformRoleLabel(): string {
    return this.user()?.platformRole === 'SUPERADMIN'
      ? 'Platform superadmin'
      : 'Company user';
  }

  protected logout(): void {
    if (this.isLoggingOut()) {
      return;
    }

    this.isLoggingOut.set(true);

    this.authStore.logout().subscribe({
      next: () => {
        this.workspaceStore.clearSession();
        this.isLoggingOut.set(false);
        void this.router.navigate(['/login']);
      },
      error: () => {
        this.authStore.clearSession();
        this.workspaceStore.clearSession();
        this.isLoggingOut.set(false);
        void this.router.navigate(['/login']);
      },
    });
  }
}
