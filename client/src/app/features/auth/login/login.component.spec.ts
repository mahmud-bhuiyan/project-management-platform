import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  const authService = {
    login: vi.fn(),
    demoLogin: vi.fn(),
    getDemoPersonas: vi.fn(),
  };

  beforeEach(async () => {
    authService.getDemoPersonas.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    authService.getDemoPersonas.mockReturnValue(of([]));
  });

  it('shows validation errors when form is empty', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form').dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Email is required.');
    expect(compiled.textContent).toContain('Password is required.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('redirects to dashboard after successful login', () => {
    authService.login.mockReturnValue(
      of({
        id: 'user-1',
        email: 'admin@acme.com',
        name: 'Acme Admin',
        platformRole: 'USER',
        avatarUrl: null,
        themePreference: 'LIGHT',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    const fixture = TestBed.createComponent(LoginComponent);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.form.setValue({
      email: 'admin@acme.com',
      password: 'password123',
    });
    component.submit();

    expect(authService.login).toHaveBeenCalledWith({
      email: 'admin@acme.com',
      password: 'password123',
    });
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });

  it('shows masked password and uses demo login when a persona is selected', () => {
    authService.demoLogin.mockReturnValue(
      of({
        id: 'user-1',
        email: 'admin@acme.dev',
        name: 'Acme Admin',
        platformRole: 'USER',
        avatarUrl: null,
        themePreference: 'LIGHT',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    const fixture = TestBed.createComponent(LoginComponent);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.fillDemoPersona({
      label: 'Company Admin',
      email: 'admin@acme.dev',
    });
    fixture.detectChanges();

    expect(component.form.getRawValue()).toEqual({
      email: 'admin@acme.dev',
      password: '',
    });
    expect(component.selectedDemoEmail()).toBe('admin@acme.dev');

    const passwordInput = fixture.nativeElement.querySelector(
      '#password',
    ) as HTMLInputElement;
    expect(passwordInput.readOnly).toBe(true);
    expect(passwordInput.value).toBe('demopassword');

    component.submit();

    expect(authService.demoLogin).toHaveBeenCalledWith('admin@acme.dev');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('shows API error message on failed login', () => {
    authService.login.mockReturnValue(
      throwError(() => ({
        error: {
          message: 'Invalid email or password',
        },
      })),
    );

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.form.setValue({
      email: 'admin@acme.com',
      password: 'wrong-password',
    });
    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Invalid email or password');
  });
});
