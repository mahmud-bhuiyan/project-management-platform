import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthStore } from '../../core/state/auth.store';
import { WorkspaceStore } from '../../core/state/workspace.store';
import { ProfileComponent } from './profile.component';

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

describe('ProfileComponent', () => {
  const authStore = {
    currentUser: signal(mockUser),
    logout: vi.fn(),
    clearSession: vi.fn(),
  };

  const workspaceStore = {
    clearSession: vi.fn(),
  };

  beforeEach(async () => {
    authStore.currentUser = signal(mockUser);

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: authStore },
        { provide: WorkspaceStore, useValue: workspaceStore },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    authStore.currentUser = signal(mockUser);
  });

  it('displays current user name and email', () => {
    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Acme Admin');
    expect(compiled.textContent).toContain('admin@acme.dev');
  });

  it('signs out and redirects to login', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    authStore.logout.mockReturnValue(of(undefined));

    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '.profile-sign-out',
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(authStore.logout).toHaveBeenCalled();
    expect(workspaceStore.clearSession).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('clears session and redirects when logout fails', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    authStore.logout.mockReturnValue(
      throwError(() => new Error('Network error')),
    );

    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '.profile-sign-out',
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(authStore.clearSession).toHaveBeenCalled();
    expect(workspaceStore.clearSession).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
