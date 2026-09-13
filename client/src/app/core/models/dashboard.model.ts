import type { TaskPriority, TaskStatus } from './task.model';

export interface TaskStatusCount {
  status: TaskStatus;
  count: number;
}

export interface TaskPriorityCount {
  priority: TaskPriority;
  count: number;
}

export interface ProjectProgressItem {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
}

export interface DashboardCharts {
  tasksByStatus: TaskStatusCount[];
  tasksByPriority: TaskPriorityCount[];
  projectProgress: ProjectProgressItem[];
}

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  charts: DashboardCharts;
}

export interface DashboardStatsResponseData {
  stats: DashboardStats;
}
