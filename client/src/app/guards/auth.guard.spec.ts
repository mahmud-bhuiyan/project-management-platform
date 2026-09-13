import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { AuthStore } from '../core/state/auth.store';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
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
              (_commands: string[]) => new UrlTree(),
            ),
          },
        },
      ],
    });
  });

  it('allows access when already authenticated', () => {
    authStore.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, {} as never),
    );

    expect(result).toBe(true);
    expect(authStore.restoreSession).not.toHaveBeenCalled();
  });

  it('restores session when refresh cookie is valid', async () => {
    authStore.isAuthenticated.mockReturnValue(false);
    authStore.restoreSession.mockReturnValue(of(true));

    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(authGuard({} as never, {} as never) as never),
    );

    expect(result).toBe(true);
    expect(authStore.restoreSession).toHaveBeenCalled();
  });

  it('redirects to login when session cannot be restored', async () => {
    const router = TestBed.inject(Router);
    const loginTree = new UrlTree();
    vi.spyOn(router, 'createUrlTree').mockReturnValue(loginTree);

    authStore.isAuthenticated.mockReturnValue(false);
    authStore.restoreSession.mockReturnValue(of(false));

    const result = await TestBed.runInInjectionContext(() =>
      firstValueFrom(authGuard({} as never, {} as never) as never),
    );

    expect(result).toBe(loginTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
