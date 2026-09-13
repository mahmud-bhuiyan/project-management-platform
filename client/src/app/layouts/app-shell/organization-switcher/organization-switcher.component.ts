import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import type { Organization } from '../../../core/models/organization.model';
import { OrganizationStore } from '../../../core/state/organization.store';
import { WorkspaceStore } from '../../../core/state/workspace.store';

@Component({
  selector: 'app-organization-switcher',
  templateUrl: './organization-switcher.component.html',
  styleUrl: './organization-switcher.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSwitcherComponent {
  private readonly organizationStore = inject(OrganizationStore);
  private readonly workspaceStore = inject(WorkspaceStore);

  protected readonly organizations = this.organizationStore.organizations;
  protected readonly activeOrganization = this.organizationStore.activeOrganization;
  protected readonly activeOrganizationId =
    this.organizationStore.activeOrganizationId;
  protected readonly isLoading = this.organizationStore.isLoading;
  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      return;
    }

    const cached = this.organizations();

    if (cached.length > 0) {
      this.menuOpen.set(true);
      this.organizationStore.loadOrganizations({ silent: true }).subscribe();
      return;
    }

    this.organizationStore.loadOrganizations().subscribe({
      next: (organizations) => {
        if (organizations.length > 0) {
          this.menuOpen.set(true);
        }
      },
    });
  }

  protected selectOrganization(organization: Organization): void {
    if (organization.id === this.activeOrganizationId()) {
      this.menuOpen.set(false);
      return;
    }

    this.organizationStore.setActiveOrganization(organization.id);
    this.menuOpen.set(false);
    this.workspaceStore.reloadForActiveOrganization().subscribe();
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
