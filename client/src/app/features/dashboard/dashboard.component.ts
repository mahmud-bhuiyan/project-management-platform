import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import type { DashboardStats } from '../../core/models/dashboard.model';
import { AuthStore } from '../../core/state/auth.store';
import { DashboardStore } from '../../core/state/dashboard.store';
import { OrganizationStore } from '../../core/state/organization.store';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';

interface StatCard {
  id: string;
  label: string;
  value: number;
  hint: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [PageHeroComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly authStore = inject(AuthStore);
  private readonly organizationStore = inject(OrganizationStore);
  private readonly dashboardStore = inject(DashboardStore);

  protected readonly user = this.authStore.currentUser;
  protected readonly activeOrganization = this.organizationStore.activeOrganization;
  protected readonly stats = this.dashboardStore.stats;
  protected readonly statsError = this.dashboardStore.statsError;
  protected readonly isLoadingStats = computed(
    () => this.dashboardStore.isLoading() && this.stats() === null,
  );

  protected readonly heroEyebrow = computed(
    () => this.activeOrganization()?.name ?? 'Your workspace',
  );

  protected readonly heroTitle = computed(() =>
    this.user()?.name
      ? `Good to see you, ${this.user()!.name}.`
      : 'Good to see you.',
  );

  protected readonly statCards = computed<StatCard[]>(() => {
    const stats = this.stats();
    if (!stats) {
      return [];
    }

    return this.buildStatCards(stats);
  });

  private buildStatCards(stats: DashboardStats): StatCard[] {
    return [
      {
        id: 'total-projects',
        label: 'Total projects',
        value: stats.totalProjects,
        hint: 'Non-archived projects',
      },
      {
        id: 'active-projects',
        label: 'Active projects',
        value: stats.activeProjects,
        hint: 'Currently in progress',
      },
      {
        id: 'total-tasks',
        label: 'Total tasks',
        value: stats.totalTasks,
        hint: 'Across all projects',
      },
      {
        id: 'completed-tasks',
        label: 'Completed tasks',
        value: stats.completedTasks,
        hint: 'Marked done',
      },
      {
        id: 'overdue-tasks',
        label: 'Overdue tasks',
        value: stats.overdueTasks,
        hint: 'Past due and open',
      },
    ];
  }
}
