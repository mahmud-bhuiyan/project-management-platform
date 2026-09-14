import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  ArcElement,
  LinearScale,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from 'chart.js';

let chartJsRegistered = false;

function ensureChartJsRegistered(): void {
  if (chartJsRegistered) {
    return;
  }

  Chart.register(
    BarController,
    BarElement,
    CategoryScale,
    DoughnutController,
    ArcElement,
    LinearScale,
    Tooltip,
    Legend,
  );
  chartJsRegistered = true;
}

@Component({
  selector: 'app-dashboard-chart',
  template: `
    <div class="dashboard-chart" [attr.aria-label]="ariaLabel()">
      <canvas #canvas></canvas>
    </div>
  `,
  styles: `
    .dashboard-chart {
      position: relative;
      height: 16rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardChartComponent implements AfterViewInit, OnDestroy {
  readonly config = input.required<ChartConfiguration>();
  readonly ariaLabel = input.required<string>();

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;
  private viewReady = false;

  constructor() {
    effect(() => {
      const nextConfig = this.config();

      if (!this.viewReady) {
        return;
      }

      this.renderChart(nextConfig);
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChart(this.config());
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private renderChart(config: ChartConfiguration): void {
    const canvas = this.canvasRef().nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    ensureChartJsRegistered();
    this.destroyChart();
    this.chart = new Chart(context, config);
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
