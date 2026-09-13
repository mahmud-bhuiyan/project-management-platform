import { TestBed } from '@angular/core/testing';
import { ProjectPriorityBadgeComponent } from './project-priority-badge.component';

describe('ProjectPriorityBadgeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectPriorityBadgeComponent],
    }).compileComponents();
  });

  it('renders priority label and tone class', () => {
    const fixture = TestBed.createComponent(ProjectPriorityBadgeComponent);
    fixture.componentRef.setInput('priority', 'CRITICAL');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('[data-testid="project-priority-CRITICAL"]');

    expect(badge?.textContent?.trim()).toBe('Critical');
    expect(badge?.classList.contains('project-badge--danger')).toBe(true);
  });
});
