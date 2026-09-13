import { TestBed } from '@angular/core/testing';
import { ProjectStatusBadgeComponent } from './project-status-badge.component';

describe('ProjectStatusBadgeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectStatusBadgeComponent],
    }).compileComponents();
  });

  it('renders status label and tone class', () => {
    const fixture = TestBed.createComponent(ProjectStatusBadgeComponent);
    fixture.componentRef.setInput('status', 'ACTIVE');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('[data-testid="project-status-ACTIVE"]');

    expect(badge?.textContent?.trim()).toBe('Active');
    expect(badge?.classList.contains('project-badge--success')).toBe(true);
  });
});
