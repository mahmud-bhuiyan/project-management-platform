import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthStore } from '../../core/state/auth.store';
import { RealtimeStore } from '../../core/state/realtime.store';
import { WorkspaceStore } from '../../core/state/workspace.store';
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
  const authStore = {
    currentUser: signal(mockUser),
    isSuperadmin: signal(false),
    logout: vi.fn(),
    clearSession: vi.fn(),
  };

  const workspaceStore = {
    isBootstrapping: signal(false),
    hasBootstrapped: signal(false),
    bootstrap: vi.fn(() => of(undefined)),
    clearSession: vi.fn(),
  };

  const realtimeStore = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  beforeEach(async () => {
    authStore.currentUser = signal(mockUser);
    authStore.isSuperadmin = signal(false);
    workspaceStore.bootstrap.mockReturnValue(of(undefined));

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
        { provide: AuthStore, useValue: authStore },
        { provide: WorkspaceStore, useValue: workspaceStore },
        { provide: RealtimeStore, useValue: realtimeStore },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    authStore.currentUser = signal(mockUser);
    authStore.isSuperadmin = signal(false);
    workspaceStore.bootstrap.mockReturnValue(of(undefined));
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
    expect(workspaceStore.bootstrap).toHaveBeenCalled();
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
    authStore.logout.mockReturnValue(of(undefined));

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="app-shell-sign-out"]',
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(authStore.logout).toHaveBeenCalled();
    expect(workspaceStore.clearSession).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('clears session and redirects when logout fails', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    authStore.logout.mockReturnValue(
      throwError(() => new Error('Network error')),
    );

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="app-shell-sign-out"]',
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(authStore.clearSession).toHaveBeenCalled();
    expect(workspaceStore.clearSession).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
