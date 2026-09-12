import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
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

  it('allows access when already authenticated', () => {
    authService.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, {} as never),
    );

    expect(result).toBe(true);
    expect(authService.restoreSession).not.toHaveBeenCalled();
  });

  it('restores session when refresh cookie is valid', async () => {
    authService.isAuthenticated.mockReturnValue(false);
    authService.restoreSession.mockReturnValue(of(true));

    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(authGuard({} as never, {} as never) as never),
    );

    expect(result).toBe(true);
    expect(authService.restoreSession).toHaveBeenCalled();
  });

  it('redirects to login when session cannot be restored', async () => {
    const router = TestBed.inject(Router);
    const loginTree = new UrlTree();
    vi.spyOn(router, 'createUrlTree').mockReturnValue(loginTree);

    authService.isAuthenticated.mockReturnValue(false);
    authService.restoreSession.mockReturnValue(of(false));

    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(authGuard({} as never, {} as never) as never),
    );

    expect(result).toBe(loginTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
