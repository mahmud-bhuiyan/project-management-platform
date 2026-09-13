import type { ChartConfiguration } from 'chart.js';
import type { DashboardCharts } from '../models/dashboard.model';
import type { TaskPriority, TaskStatus } from '../models/task.model';
import {
  taskPriorityBadgeTone,
  taskPriorityLabel,
  taskStatusBadgeTone,
  taskStatusLabel,
} from './task.util';

const CHART_COLORS: Record<
  ReturnType<typeof taskStatusBadgeTone>,
  string
> = {
  muted: '#c4b5fd',
  info: '#7c6df0',
  success: '#22d3ee',
  warning: '#f59e0b',
  danger: '#ef4444',
  neutral: '#4338a8',
};

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#4338a8',
        font: {
          family: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
          size: 12,
        },
      },
    },
  },
} satisfies ChartConfiguration['options'];

function colorForStatus(status: TaskStatus): string {
  return CHART_COLORS[taskStatusBadgeTone(status)];
}

function colorForPriority(priority: TaskPriority): string {
  return CHART_COLORS[taskPriorityBadgeTone(priority)];
}

export function buildTasksByStatusChartConfig(
  charts: DashboardCharts,
): ChartConfiguration<'doughnut'> {
  const labels = charts.tasksByStatus.map((item) =>
    taskStatusLabel(item.status),
  );
  const data = charts.tasksByStatus.map((item) => item.count);
  const backgroundColor = charts.tasksByStatus.map((item) =>
    colorForStatus(item.status),
  );

  return {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    },
    options: {
      ...CHART_OPTIONS,
      cutout: '62%',
      plugins: {
        ...CHART_OPTIONS.plugins,
        legend: {
          ...CHART_OPTIONS.plugins?.legend,
          position: 'bottom',
        },
      },
    },
  };
}

export function buildTasksByPriorityChartConfig(
  charts: DashboardCharts,
): ChartConfiguration<'bar'> {
  const labels = charts.tasksByPriority.map((item) =>
    taskPriorityLabel(item.priority),
  );
  const data = charts.tasksByPriority.map((item) => item.count);
  const backgroundColor = charts.tasksByPriority.map((item) =>
    colorForPriority(item.priority),
  );

  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Tasks',
          data,
          backgroundColor,
          borderRadius: 8,
          maxBarThickness: 48,
        },
      ],
    },
    options: {
      ...CHART_OPTIONS,
      plugins: {
        ...CHART_OPTIONS.plugins,
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          ticks: { color: '#4338a8' },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#4338a8',
            precision: 0,
          },
          grid: { color: 'rgb(124 109 240 / 0.12)' },
        },
      },
    },
  };
}

export function buildProjectProgressChartConfig(
  charts: DashboardCharts,
): ChartConfiguration<'bar'> {
  const labels = charts.projectProgress.map((item) => item.projectName);
  const completed = charts.projectProgress.map((item) => item.completedTasks);
  const open = charts.projectProgress.map(
    (item) => item.totalTasks - item.completedTasks,
  );

  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Completed',
          data: completed,
          backgroundColor: '#22d3ee',
          borderRadius: 8,
          maxBarThickness: 40,
        },
        {
          label: 'Open',
          data: open,
          backgroundColor: '#d4ccfc',
          borderRadius: 8,
          maxBarThickness: 40,
        },
      ],
    },
    options: {
      ...CHART_OPTIONS,
      indexAxis: 'y',
      plugins: {
        ...CHART_OPTIONS.plugins,
        legend: {
          ...CHART_OPTIONS.plugins?.legend,
          position: 'bottom',
        },
      },
      scales: {
        x: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            color: '#4338a8',
            precision: 0,
          },
          grid: { color: 'rgb(124 109 240 / 0.12)' },
        },
        y: {
          stacked: true,
          ticks: { color: '#4338a8' },
          grid: { display: false },
        },
      },
    },
  };
}

export function dashboardChartsHaveData(charts: DashboardCharts): boolean {
  const hasStatusData = charts.tasksByStatus.some((item) => item.count > 0);
  const hasPriorityData = charts.tasksByPriority.some((item) => item.count > 0);
  const hasProjectData = charts.projectProgress.length > 0;

  return hasStatusData || hasPriorityData || hasProjectData;
}
