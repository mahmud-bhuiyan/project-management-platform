export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export interface DashboardStatsResponseData {
  stats: DashboardStats;
}
