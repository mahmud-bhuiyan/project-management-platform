import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-unauthorized',
  imports: [RouterLink, PageHeroComponent, EmptyStateComponent],
  templateUrl: './unauthorized.component.html',
  styleUrl: './unauthorized.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnauthorizedComponent {}
