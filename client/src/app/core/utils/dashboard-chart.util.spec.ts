import { describe, expect, it } from 'vitest';
import type { DashboardCharts } from '../models/dashboard.model';
import {
  buildProjectProgressChartConfig,
  buildTasksByPriorityChartConfig,
  buildTasksByStatusChartConfig,
  dashboardChartsHaveData,
} from './dashboard-chart.util';

const charts: DashboardCharts = {
  tasksByStatus: [
    { status: 'BACKLOG', count: 1 },
    { status: 'TODO', count: 2 },
    { status: 'IN_PROGRESS', count: 0 },
    { status: 'REVIEW', count: 0 },
    { status: 'DONE', count: 3 },
  ],
  tasksByPriority: [
    { priority: 'LOW', count: 1 },
    { priority: 'MEDIUM', count: 4 },
    { priority: 'HIGH', count: 1 },
    { priority: 'CRITICAL', count: 0 },
  ],
  projectProgress: [
    {
      projectId: 'project-1',
      projectName: 'Website',
      totalTasks: 5,
      completedTasks: 2,
    },
  ],
};

describe('dashboard-chart.util', () => {
  it('builds doughnut config for tasks by status', () => {
    const config = buildTasksByStatusChartConfig(charts);

    expect(config.type).toBe('doughnut');
    expect(config.data?.labels).toEqual([
      'Backlog',
      'Todo',
      'In progress',
      'Review',
      'Done',
    ]);
    expect(config.data?.datasets?.[0]?.data).toEqual([1, 2, 0, 0, 3]);
  });

  it('builds bar config for tasks by priority', () => {
    const config = buildTasksByPriorityChartConfig(charts);

    expect(config.type).toBe('bar');
    expect(config.data?.labels).toEqual(['Low', 'Medium', 'High', 'Critical']);
    expect(config.data?.datasets?.[0]?.data).toEqual([1, 4, 1, 0]);
  });

  it('builds stacked horizontal bar config for project progress', () => {
    const config = buildProjectProgressChartConfig(charts);

    expect(config.type).toBe('bar');
    expect(config.options?.indexAxis).toBe('y');
    expect(config.data?.labels).toEqual(['Website']);
    expect(config.data?.datasets?.[0]?.data).toEqual([2]);
    expect(config.data?.datasets?.[1]?.data).toEqual([3]);
  });

  it('detects when chart data exists', () => {
    expect(dashboardChartsHaveData(charts)).toBe(true);
    expect(
      dashboardChartsHaveData({
        tasksByStatus: charts.tasksByStatus.map((item) => ({ ...item, count: 0 })),
        tasksByPriority: charts.tasksByPriority.map((item) => ({
          ...item,
          count: 0,
        })),
        projectProgress: [],
      }),
    ).toBe(false);
  });
});
