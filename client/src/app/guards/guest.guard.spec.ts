import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { AuthStore } from '../core/state/auth.store';
import { guestGuard } from './guest.guard';

describe('guestGuard', () => {
  const authStore = {
    isAuthenticated: vi.fn(),
    restoreSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: authStore },
        {
          provide: Router,
          useValue: {
            createUrlTree: vi.fn(
              (commands: string[]) => new UrlTree(),
            ),
          },
        },
      ],
    });
  });

  it('redirects authenticated users to dashboard', () => {
    const router = TestBed.inject(Router);
    const dashboardTree = new UrlTree();
    vi.spyOn(router, 'createUrlTree').mockReturnValue(dashboardTree);

    authStore.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      guestGuard({} as never, {} as never),
    );

    expect(result).toBe(dashboardTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });

  it('allows login when session cannot be restored', async () => {
    authStore.isAuthenticated.mockReturnValue(false);
    authStore.restoreSession.mockReturnValue(of(false));

    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(guestGuard({} as never, {} as never) as never),
    );

    expect(result).toBe(true);
    expect(authStore.restoreSession).toHaveBeenCalled();
  });

  it('redirects to dashboard when refresh cookie restores session', async () => {
    const router = TestBed.inject(Router);
    const dashboardTree = new UrlTree();
    vi.spyOn(router, 'createUrlTree').mockReturnValue(dashboardTree);

    authStore.isAuthenticated.mockReturnValue(false);
    authStore.restoreSession.mockReturnValue(of(true));

    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(guestGuard({} as never, {} as never) as never),
    );

    expect(result).toBe(dashboardTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });
});
