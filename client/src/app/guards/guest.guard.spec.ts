import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { guestGuard } from './guest.guard';

describe('guestGuard', () => {
  const authService = {
    isAuthenticated: vi.fn(),
    restoreSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
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

    authService.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      guestGuard({} as never, {} as never),
    );

    expect(result).toBe(dashboardTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });

  it('allows login when session cannot be restored', async () => {
    authService.isAuthenticated.mockReturnValue(false);
    authService.restoreSession.mockReturnValue(of(false));

    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(guestGuard({} as never, {} as never) as never),
    );

    expect(result).toBe(true);
    expect(authService.restoreSession).toHaveBeenCalled();
  });

  it('redirects to dashboard when refresh cookie restores session', async () => {
    const router = TestBed.inject(Router);
    const dashboardTree = new UrlTree();
    vi.spyOn(router, 'createUrlTree').mockReturnValue(dashboardTree);

    authService.isAuthenticated.mockReturnValue(false);
    authService.restoreSession.mockReturnValue(of(true));

    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(guestGuard({} as never, {} as never) as never),
    );

    expect(result).toBe(dashboardTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });
});
