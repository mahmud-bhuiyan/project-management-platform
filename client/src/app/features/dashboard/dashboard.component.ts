import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import type { DashboardStats } from '../../core/models/dashboard.model';
import {
  buildProjectProgressChartConfig,
  buildTasksByPriorityChartConfig,
  buildTasksByStatusChartConfig,
  dashboardChartsHaveData,
} from '../../core/utils/dashboard-chart.util';
import { AuthStore } from '../../core/state/auth.store';
import { DashboardStore } from '../../core/state/dashboard.store';
import { OrganizationStore } from '../../core/state/organization.store';
import { DashboardChartComponent } from '../../shared/components/dashboard-chart/dashboard-chart.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';

interface StatCard {
  id: string;
  label: string;
  value: number;
  hint: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [PageHeroComponent, DashboardChartComponent],
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

  protected readonly chartsHaveData = computed(() => {
    const stats = this.stats();
    return stats ? dashboardChartsHaveData(stats.charts) : false;
  });

  protected readonly tasksByStatusChart = computed(() => {
    const stats = this.stats();
    return stats ? buildTasksByStatusChartConfig(stats.charts) : null;
  });

  protected readonly tasksByPriorityChart = computed(() => {
    const stats = this.stats();
    return stats ? buildTasksByPriorityChartConfig(stats.charts) : null;
  });

  protected readonly projectProgressChart = computed(() => {
    const stats = this.stats();
    return stats ? buildProjectProgressChartConfig(stats.charts) : null;
  });

  protected readonly hasProjectProgress = computed(
    () => (this.stats()?.charts.projectProgress.length ?? 0) > 0,
  );

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
