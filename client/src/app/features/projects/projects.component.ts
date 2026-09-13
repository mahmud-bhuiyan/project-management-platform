import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrganizationStore } from '../../core/state/organization.store';
import { ProjectsStore } from '../../core/state/projects.store';
import { canManageOrganizationMembers } from '../../core/utils/organization-role.util';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { ProjectCardComponent } from '../../shared/components/project-card/project-card.component';

@Component({
  selector: 'app-projects',
  imports: [
    RouterLink,
    PageHeroComponent,
    ProjectCardComponent,
    EmptyStateComponent,
  ],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsComponent {
  private readonly organizationStore = inject(OrganizationStore);
  private readonly projectsStore = inject(ProjectsStore);

  protected readonly activeOrganization = this.organizationStore.activeOrganization;
  protected readonly projects = this.projectsStore.projects;
  protected readonly projectsError = this.projectsStore.projectsError;

  protected readonly canManage = computed(() => {
    const role = this.activeOrganization()?.role;
    return role ? canManageOrganizationMembers(role) : false;
  });

  protected readonly isInitialLoad = computed(
    () =>
      this.projectsStore.isLoading() &&
      !this.projectsStore.hasLoaded() &&
      this.projects().length === 0,
  );

  protected readonly showEmptyState = computed(
    () =>
      !!this.activeOrganization() &&
      this.projectsStore.hasLoaded() &&
      this.projects().length === 0 &&
      !this.projectsError(),
  );

  protected canEditProject(project: { status: string }): boolean {
    return this.canManage() && project.status !== 'ARCHIVED';
  }
}
