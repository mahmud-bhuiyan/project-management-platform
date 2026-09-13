import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import type { Organization } from '../../../core/models/organization.model';
import { OrganizationService } from '../../../core/services/organization.service';

@Component({
  selector: 'app-organization-switcher',
  templateUrl: './organization-switcher.component.html',
  styleUrl: './organization-switcher.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSwitcherComponent {
  private readonly organizationService = inject(OrganizationService);

  protected readonly organizations = this.organizationService.organizations;
  protected readonly activeOrganization = this.organizationService.activeOrganization;
  protected readonly activeOrganizationId =
    this.organizationService.activeOrganizationId;
  protected readonly isLoading = this.organizationService.isLoading;
  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      return;
    }

    this.organizationService.loadOrganizations().subscribe({
      next: (organizations) => {
        if (organizations.length > 0) {
          this.menuOpen.set(true);
        }
      },
    });
  }

  protected selectOrganization(organization: Organization): void {
    this.organizationService.setActiveOrganization(organization.id);
    this.menuOpen.set(false);
  }

  protected formatRole(role: Organization['role']): string {
    return role.charAt(0) + role.slice(1).toLowerCase();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (!target.closest('.org-switcher')) {
      this.menuOpen.set(false);
    }
  }
}
