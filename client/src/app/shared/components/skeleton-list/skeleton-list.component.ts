import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-list',
  templateUrl: './skeleton-list.component.html',
  styleUrl: './skeleton-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonListComponent {
  readonly count = input(3);
  readonly variant = input<'row' | 'card'>('row');
  readonly ariaLabel = input('Loading…');

  protected placeholders(): number[] {
    return Array.from({ length: this.count() }, (_, index) => index);
  }
}
