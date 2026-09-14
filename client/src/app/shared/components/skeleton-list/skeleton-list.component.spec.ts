import { TestBed } from '@angular/core/testing';
import { SkeletonListComponent } from './skeleton-list.component';

describe('SkeletonListComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonListComponent],
    }).compileComponents();
  });

  it('renders the requested number of skeleton rows', () => {
    const fixture = TestBed.createComponent(SkeletonListComponent);
    fixture.componentRef.setInput('count', 4);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.skeleton-list__item')).toHaveLength(4);
    expect(compiled.textContent).toContain('Loading…');
  });
});
