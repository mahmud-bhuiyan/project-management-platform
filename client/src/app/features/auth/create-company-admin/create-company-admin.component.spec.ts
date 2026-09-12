import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CreateCompanyAdminComponent } from './create-company-admin.component';

describe('CreateCompanyAdminComponent', () => {
  const authService = {
    createCompanyAdmin: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateCompanyAdminComponent],
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
  });

  it('shows validation errors when form is empty', () => {
    const fixture = TestBed.createComponent(CreateCompanyAdminComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form').dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Email is required.');
    expect(compiled.textContent).toContain('Name is required.');
    expect(compiled.textContent).toContain('Password is required.');
    expect(compiled.textContent).toContain('Organization name is required.');
    expect(authService.createCompanyAdmin).not.toHaveBeenCalled();
  });

  it('auto-generates organization slug from organization name', () => {
    const fixture = TestBed.createComponent(CreateCompanyAdminComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.controls.organizationName.setValue('Acme Technologies');
    component.onOrganizationNameInput();

    expect(component.form.controls.organizationSlug.value).toBe(
      'acme-technologies',
    );
  });

  it('shows success state after creating a company admin', () => {
    authService.createCompanyAdmin.mockReturnValue(
      of({
        user: {
          id: 'user-1',
          email: 'admin@newco.com',
          name: 'New Admin',
          platformRole: 'USER',
          avatarUrl: null,
          themePreference: 'LIGHT',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        organization: {
          id: 'org-1',
          name: 'New Co',
          slug: 'new-co',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      }),
    );

    const fixture = TestBed.createComponent(CreateCompanyAdminComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.setValue({
      email: 'admin@newco.com',
      name: 'New Admin',
      password: 'password123',
      organizationName: 'New Co',
      organizationSlug: 'new-co',
    });
    component.submit();
    fixture.detectChanges();

    expect(authService.createCompanyAdmin).toHaveBeenCalledWith({
      email: 'admin@newco.com',
      name: 'New Admin',
      password: 'password123',
      organizationName: 'New Co',
      organizationSlug: 'new-co',
    });
    expect(component.successResult()?.organization.slug).toBe('new-co');
    expect(fixture.nativeElement.textContent).toContain('Company admin created');
  });

  it('shows API error message on duplicate email', () => {
    authService.createCompanyAdmin.mockReturnValue(
      throwError(() => ({
        error: {
          message: 'Email is already registered',
        },
      })),
    );

    const fixture = TestBed.createComponent(CreateCompanyAdminComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.setValue({
      email: 'admin@acme.com',
      name: 'Acme Admin',
      password: 'password123',
      organizationName: 'Acme Technologies',
      organizationSlug: 'acme-technologies',
    });
    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Email is already registered');
  });
});
