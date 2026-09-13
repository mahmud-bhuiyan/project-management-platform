import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { DashboardStats } from '../../core/models/dashboard.model';
import type { Organization } from '../../core/models/organization.model';
import { AuthStore } from '../../core/state/auth.store';
import { DashboardStore } from '../../core/state/dashboard.store';
import { OrganizationStore } from '../../core/state/organization.store';
import { DashboardComponent } from './dashboard.component';

const organization: Organization = {
  id: 'org-1',
  name: 'Acme Technologies',
  slug: 'acme',
  role: 'OWNER',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const stats: DashboardStats = {
  totalProjects: 2,
  activeProjects: 1,
  totalTasks: 8,
  completedTasks: 3,
  overdueTasks: 1,
};

describe('DashboardComponent', () => {
  const organizationStore = {
    activeOrganization: signal<Organization | null>(organization),
  };

  const dashboardStore = {
    stats: signal<DashboardStats | null>(stats),
    statsError: signal<string | null>(null),
    isLoading: signal(false),
  };

  const authStore = {
    currentUser: signal({
      id: 'user-1',
      email: 'admin@acme.dev',
      name: 'Acme Admin',
      platformRole: 'USER' as const,
      avatarUrl: null,
      themePreference: 'LIGHT' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }),
  };

  beforeEach(async () => {
    organizationStore.activeOrganization = signal<Organization | null>(organization);
    dashboardStore.stats = signal<DashboardStats | null>(stats);
    dashboardStore.statsError = signal<string | null>(null);
    dashboardStore.isLoading = signal(false);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: OrganizationStore, useValue: organizationStore },
        { provide: DashboardStore, useValue: dashboardStore },
        { provide: AuthStore, useValue: authStore },
      ],
    }).compileComponents();
  });

  it('displays dashboard stats from the store', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="dashboard-stats"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="dashboard-stat-total-projects"]')?.textContent).toContain('2');
    expect(compiled.querySelector('[data-testid="dashboard-activity-empty"]')).toBeTruthy();
  });

  it('shows a message when no organization is selected', async () => {
    organizationStore.activeOrganization = signal<Organization | null>(null);
    dashboardStore.stats = signal<DashboardStats | null>(null);

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No organization selected');
    expect(compiled.querySelector('[data-testid="dashboard-stats"]')).toBeNull();
  });

  it('shows an error from the store', async () => {
    dashboardStore.stats = signal<DashboardStats | null>(null);
    dashboardStore.statsError = signal('Organization not found');

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Organization not found',
    );
  });
});
