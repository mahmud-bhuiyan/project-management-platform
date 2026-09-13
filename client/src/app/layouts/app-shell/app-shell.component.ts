import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { OrganizationService } from '../../core/services/organization.service';
import { OrganizationSwitcherComponent } from './organization-switcher/organization-switcher.component';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    OrganizationSwitcherComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  private readonly authService = inject(AuthService);
  private readonly organizationService = inject(OrganizationService);
  private readonly router = inject(Router);

  protected readonly user = this.authService.currentUser;
  protected readonly isSuperadmin = this.authService.isSuperadmin;
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

    this.organizationService.loadOrganizations().subscribe();
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

    this.authService.logout().subscribe({
      next: () => {
        this.organizationService.clear();
        this.isSigningOut.set(false);
        void this.router.navigate(['/login']);
      },
      error: () => {
        this.authService.clearSession();
        this.organizationService.clear();
        this.isSigningOut.set(false);
        void this.router.navigate(['/login']);
      },
    });
  }
}
