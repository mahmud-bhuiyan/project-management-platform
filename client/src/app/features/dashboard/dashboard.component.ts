import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { OrganizationService } from '../../core/services/organization.service';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-dashboard',
  imports: [PageHeroComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly organizationService = inject(OrganizationService);

  protected readonly user = this.authService.currentUser;
  protected readonly activeOrganization =
    this.organizationService.activeOrganization;

  protected readonly heroEyebrow = computed(
    () => this.activeOrganization()?.name ?? 'Your workspace',
  );

  protected readonly heroTitle = computed(() =>
    this.user()?.name
      ? `Good to see you, ${this.user()!.name}.`
      : 'Good to see you.',
  );
}
