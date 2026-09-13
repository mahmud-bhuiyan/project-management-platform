import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthStore } from '../../core/state/auth.store';
import { OrganizationStore } from '../../core/state/organization.store';
import { WorkspaceStore } from '../../core/state/workspace.store';
import { NotificationBellComponent } from './notification-bell/notification-bell.component';
import { OrganizationSwitcherComponent } from './organization-switcher/organization-switcher.component';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    OrganizationSwitcherComponent,
    NotificationBellComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  private readonly authStore = inject(AuthStore);
  private readonly workspaceStore = inject(WorkspaceStore);
  private readonly router = inject(Router);

  protected readonly user = this.authStore.currentUser;
  protected readonly isSuperadmin = this.authStore.isSuperadmin;
  protected readonly isBootstrapping = this.workspaceStore.isBootstrapping;
  protected readonly isSigningOut = signal(false);
  protected readonly mobileNavOpen = signal(false);
  protected readonly pageTitle = signal('Dashboard');

  constructor() {
    this.pageTitle.set(this.resolvePageTitle(this.router.url));

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.pageTitle.set(this.resolvePageTitle(this.router.url));
        this.closeMobileNav();
      });

    this.workspaceStore.bootstrap().subscribe();
  }

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

  protected todayLabel(): string {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  }

  protected todayLabelShort(): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date());
  }

  protected toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }

  protected closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  private resolvePageTitle(url: string): string {
    if (url.includes('/profile')) {
      return 'Profile';
    }

    if (url.includes('/team')) {
      return 'Team';
    }

    if (url.includes('/projects/new')) {
      return 'Create project';
    }

    if (url.includes('/projects/') && url.includes('/edit')) {
      return 'Edit project';
    }

    if (url.includes('/projects/') && url.includes('/board')) {
      return 'Kanban board';
    }

    if (url.includes('/projects/') && url.includes('/tasks/') && url.includes('/edit')) {
      return 'Edit task';
    }

    if (url.includes('/projects/') && url.includes('/tasks/')) {
      return 'Task details';
    }

    if (url.includes('/projects/') && url.includes('/tasks/new')) {
      return 'Create task';
    }

    if (url.includes('/projects/')) {
      return 'Project';
    }

    if (url.includes('/projects')) {
      return 'Projects';
    }

    if (url.includes('/organization')) {
      return 'Organization';
    }

    if (url.includes('/admin/company-admins')) {
      return 'Provision company';
    }

    if (url.includes('/dashboard')) {
      return 'Dashboard';
    }

    return 'Flowdesk';
  }

  protected signOut(): void {
    if (this.isSigningOut()) {
      return;
    }

    this.isSigningOut.set(true);
    this.closeMobileNav();

    this.authStore.logout().subscribe({
      next: () => {
        this.workspaceStore.clearSession();
        this.isSigningOut.set(false);
        void this.router.navigate(['/login']);
      },
      error: () => {
        this.authStore.clearSession();
        this.workspaceStore.clearSession();
        this.isSigningOut.set(false);
        void this.router.navigate(['/login']);
      },
    });
  }
}
