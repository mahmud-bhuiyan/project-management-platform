import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UnauthorizedComponent } from './unauthorized.component';

describe('UnauthorizedComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnauthorizedComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders an unauthorized message and navigation links', () => {
    const fixture = TestBed.createComponent(UnauthorizedComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Unauthorized');
    expect(compiled.querySelector('[data-testid="unauthorized-dashboard-link"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="unauthorized-projects-link"]')).toBeTruthy();
  });
});
