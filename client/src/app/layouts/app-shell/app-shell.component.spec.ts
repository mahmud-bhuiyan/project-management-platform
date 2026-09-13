import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { OrganizationService } from '../../core/services/organization.service';
import { DashboardComponent } from '../../features/dashboard/dashboard.component';
import { AppShellComponent } from './app-shell.component';

const mockUser = {
  id: 'user-1',
  email: 'admin@acme.dev',
  name: 'Acme Admin',
  platformRole: 'USER' as const,
  avatarUrl: null,
  themePreference: 'LIGHT' as const,
  createdAt: '2026-01-15T00:00:00.000Z',
  updatedAt: '2026-01-15T00:00:00.000Z',
};

describe('AppShellComponent', () => {
  const authService = {
    currentUser: signal(mockUser),
    isSuperadmin: signal(false),
    logout: vi.fn(),
    clearSession: vi.fn(),
  };

  const organizationService = {
    organizations: signal([]),
    activeOrganization: signal(null),
    activeOrganizationId: signal(null),
    isLoading: signal(false),
    loadOrganizations: vi.fn(() => of([])),
    clear: vi.fn(),
  };

  beforeEach(async () => {
    authService.currentUser = signal(mockUser);
    authService.isSuperadmin = signal(false);
    organizationService.loadOrganizations.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([
          {
            path: '',
            component: AppShellComponent,
            children: [{ path: 'dashboard', component: DashboardComponent }],
          },
        ]),
        { provide: AuthService, useValue: authService },
        { provide: OrganizationService, useValue: organizationService },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    authService.currentUser = signal(mockUser);
    authService.isSuperadmin = signal(false);
  });

  it('renders sidebar navigation, header, and outlet', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-shell__sidebar')).toBeTruthy();
    expect(compiled.querySelector('.app-shell__header')).toBeTruthy();
    expect(compiled.querySelector('.app-shell__content router-outlet')).toBeTruthy();
    expect(compiled.textContent).toContain('Dashboard');
    expect(compiled.textContent).toContain('Team');
    expect(compiled.textContent).toContain('Organization');
    expect(compiled.textContent).toContain('Acme Admin');
  });

  it('shows the dashboard page title on the dashboard route', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['pageTitle']()).toBe('Dashboard');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.app-shell__page-title',
      )?.textContent,
    ).toContain('Dashboard');
  });

  it('signs out and redirects to login', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    authService.logout.mockReturnValue(of(undefined));

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="app-shell-sign-out"]',
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(authService.logout).toHaveBeenCalled();
    expect(organizationService.clear).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('clears session and redirects when logout fails', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    authService.logout.mockReturnValue(
      throwError(() => new Error('Network error')),
    );

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="app-shell-sign-out"]',
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(authService.clearSession).toHaveBeenCalled();
    expect(organizationService.clear).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
