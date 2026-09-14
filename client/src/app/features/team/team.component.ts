import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import type { OrganizationMember } from '../../core/models/organization-member.model';
import type { OrganizationRole } from '../../core/models/organization.model';
import { ToastService } from '../../core/services/toast.service';
import { OrganizationStore } from '../../core/state/organization.store';
import { TeamStore } from '../../core/state/team.store';
import {
  canAssignOrganizationRole,
  canManageOrganizationMembers,
  canModifyMember,
  organizationRoleLabel,
} from '../../core/utils/organization-role.util';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { DataTableRowDirective } from '../../shared/components/data-table/data-table-row.directive';
import type {
  DataTableColumn,
  DataTableConfig,
} from '../../shared/components/data-table/data-table.types';
import { DEFAULT_PAGE_SIZE } from '../../shared/components/data-table/data-table.types';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';

const ASSIGNABLE_ROLES: OrganizationRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];

const ADD_MEMBER_ROLES: OrganizationRole[] = ['ADMIN', 'MEMBER', 'VIEWER'];

interface PendingRoleChange {
  memberId: string;
  member: OrganizationMember;
  previousRole: OrganizationRole;
  nextRole: OrganizationRole;
}

@Component({
  selector: 'app-team',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    DatePipe,
    DataTableComponent,
    DataTableRowDirective,
    ModalComponent,
    PageHeroComponent,
  ],
  templateUrl: './team.component.html',
  styleUrl: './team.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamComponent {
  private readonly organizationStore = inject(OrganizationStore);
  private readonly teamStore = inject(TeamStore);
  private readonly toastService = inject(ToastService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly activeOrganization = this.organizationStore.activeOrganization;
  protected readonly members = this.teamStore.members;
  protected readonly membersError = this.teamStore.membersError;
  protected readonly isLoadingMembers = computed(
    () => this.teamStore.isLoading() && this.members().length === 0,
  );
  protected readonly isAddingMember = signal(false);
  protected readonly addMemberError = signal<string | null>(null);
  protected readonly rowActionMemberId = signal<string | null>(null);
  protected readonly rowActionError = signal<string | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly isAddMemberModalOpen = signal(false);
  protected readonly pendingRoleChange = signal<PendingRoleChange | null>(null);
  protected readonly isConfirmingRoleChange = signal(false);
  protected readonly selectedMemberForView = signal<OrganizationMember | null>(null);
  protected readonly pendingRemoveMember = signal<OrganizationMember | null>(null);
  protected readonly isRemovingMember = signal(false);

  protected readonly isRoleChangeModalOpen = computed(
    () => this.pendingRoleChange() !== null,
  );

  protected readonly isViewMemberModalOpen = computed(
    () => this.selectedMemberForView() !== null,
  );

  protected readonly isRemoveMemberModalOpen = computed(
    () => this.pendingRemoveMember() !== null,
  );

  protected readonly roleChangeModalDescription = computed(() => {
    const pending = this.pendingRoleChange();
    if (!pending) {
      return null;
    }

    return `You changed ${pending.member.user.name}'s role from ${this.roleLabel(pending.previousRole)} to ${this.roleLabel(pending.nextRole)}. Was this intentional?`;
  });

  protected readonly removeMemberModalDescription = computed(() => {
    const member = this.pendingRemoveMember();
    if (!member) {
      return null;
    }

    return `Remove ${member.user.name} from this organization? They will lose access immediately.`;
  });

  protected readonly teamTableConfig: Partial<DataTableConfig> = {
    pageSize: DEFAULT_PAGE_SIZE,
    pageSizeOptions: [5, 10, 20, 50, 100],
    defaultHeaderAlign: 'center',
    defaultCellAlign: 'center',
    stripedRows: true,
  };

  protected readonly canManage = computed(() => {
    const role = this.activeOrganization()?.role;
    return role ? canManageOrganizationMembers(role) : false;
  });

  protected readonly filteredMembers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();

    if (!query) {
      return this.members();
    }

    return this.members().filter((member) => {
      const name = member.user.name.toLowerCase();
      const email = member.user.email.toLowerCase();
      const role = organizationRoleLabel(member.role).toLowerCase();

      return name.includes(query) || email.includes(query) || role.includes(query);
    });
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredMembers().length / this.pageSize())),
  );

  protected readonly paginatedMembers = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize();
    return this.filteredMembers().slice(start, start + this.pageSize());
  });

  protected readonly pageSummary = computed(() => {
    const total = this.filteredMembers().length;

    if (total === 0) {
      return { start: 0, end: 0, total };
    }

    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize() + 1;
    const end = Math.min(page * this.pageSize(), total);

    return { start, end, total };
  });

  protected readonly memberColumns = computed<DataTableColumn[]>(() => [
    { id: 'member', label: 'Member', widthPercent: 22, cellAlign: 'left' },
    { id: 'email', label: 'Email', widthPercent: 24, cellAlign: 'center' },
    { id: 'role', label: 'Role', widthPercent: 16, cellAlign: 'center' },
    { id: 'joined', label: 'Joined', widthPercent: 14, cellAlign: 'center' },
    { id: 'actions', label: 'Actions', widthPercent: 24, cellAlign: 'center' },
  ]);

  protected readonly addMemberForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    role: this.formBuilder.control<OrganizationRole>('MEMBER'),
  });

  constructor() {
    effect(() => {
      this.searchQuery();
      this.members();
      this.pageSize();
      this.currentPage.set(1);
    });

    effect(() => {
      const totalPages = this.totalPages();
      if (this.currentPage() > totalPages) {
        this.currentPage.set(totalPages);
      }
    });
  }

  protected memberInitials(member: OrganizationMember): string {
    const name = member.user.name?.trim();

    if (!name) {
      return '?';
    }

    const parts = name.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  protected roleLabel(role: OrganizationRole): string {
    return organizationRoleLabel(role);
  }

  protected platformRoleLabel(member: OrganizationMember): string {
    return member.user.platformRole === 'SUPERADMIN'
      ? 'Platform superadmin'
      : 'Company user';
  }

  protected openViewMember(member: OrganizationMember): void {
    this.selectedMemberForView.set(member);
  }

  protected closeViewMemberModal(): void {
    this.selectedMemberForView.set(null);
  }

  protected addRoleOptions(): OrganizationRole[] {
    const actorRole = this.activeOrganization()?.role;
    if (!actorRole) {
      return [];
    }

    return ADD_MEMBER_ROLES.filter((role) => canAssignOrganizationRole(actorRole, role));
  }

  protected roleOptionsForMember(member: OrganizationMember): OrganizationRole[] {
    const actorRole = this.activeOrganization()?.role;
    if (!actorRole || !this.canManageMember(member)) {
      return [member.role];
    }

    return ASSIGNABLE_ROLES.filter((role) => canAssignOrganizationRole(actorRole, role));
  }

  protected canManageMember(member: OrganizationMember): boolean {
    const actorRole = this.activeOrganization()?.role;
    if (!actorRole) {
      return false;
    }

    return canModifyMember(actorRole, member.role);
  }

  protected isRowBusy(memberId: string): boolean {
    return this.rowActionMemberId() === memberId;
  }

  protected onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  protected onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  protected openAddMemberModal(): void {
    this.addMemberError.set(null);
    this.addMemberForm.reset({ email: '', role: 'MEMBER' });
    this.isAddMemberModalOpen.set(true);
  }

  protected closeAddMemberModal(): void {
    if (this.isAddingMember()) {
      return;
    }

    this.isAddMemberModalOpen.set(false);
    this.addMemberError.set(null);
    this.addMemberForm.reset({ email: '', role: 'MEMBER' });
  }

  protected submitAddMember(): void {
    if (!this.canManage() || this.addMemberForm.invalid) {
      this.addMemberForm.markAllAsTouched();
      return;
    }

    const organization = this.activeOrganization();
    if (!organization) {
      return;
    }

    this.isAddingMember.set(true);
    this.addMemberError.set(null);

    const { email, role } = this.addMemberForm.getRawValue();

    this.teamStore
      .addMember({ organizationId: organization.id, email, role })
      .pipe(finalize(() => this.isAddingMember.set(false)))
      .subscribe({
        next: () => {
          this.isAddMemberModalOpen.set(false);
          this.addMemberForm.reset({ email: '', role: 'MEMBER' });
          this.toastService.success('Team member added.');
        },
        error: (error: HttpErrorResponse) => {
          const message = this.extractErrorMessage(error);
          this.addMemberError.set(message);
          this.toastService.error(message);
        },
      });
  }

  protected roleSelectValue(member: OrganizationMember): OrganizationRole {
    const pending = this.pendingRoleChange();
    if (pending?.memberId === member.id) {
      return pending.nextRole;
    }

    return member.role;
  }

  protected onRoleSelectChange(
    member: OrganizationMember,
    nextRole: OrganizationRole,
  ): void {
    if (
      !this.canManageMember(member) ||
      member.role === nextRole ||
      this.isRowBusy(member.id) ||
      this.pendingRoleChange()
    ) {
      return;
    }

    this.pendingRoleChange.set({
      memberId: member.id,
      member,
      previousRole: member.role,
      nextRole,
    });
  }

  protected closeRoleChangeModal(): void {
    if (this.isConfirmingRoleChange()) {
      return;
    }

    this.pendingRoleChange.set(null);
  }

  protected confirmRoleChange(): void {
    const pending = this.pendingRoleChange();
    if (!pending || this.isConfirmingRoleChange()) {
      return;
    }

    const organization = this.activeOrganization();
    if (!organization) {
      return;
    }

    const { member, nextRole } = pending;
    this.isConfirmingRoleChange.set(true);
    this.rowActionMemberId.set(member.id);
    this.rowActionError.set(null);

    this.teamStore
      .updateMemberRole({
        organizationId: organization.id,
        memberId: member.id,
        role: nextRole,
      })
      .pipe(
        finalize(() => {
          this.isConfirmingRoleChange.set(false);
          this.rowActionMemberId.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.pendingRoleChange.set(null);
          this.toastService.success('Member role updated.');
        },
        error: (error: HttpErrorResponse) => {
          const message = this.extractErrorMessage(error);
          this.rowActionError.set(message);
          this.pendingRoleChange.set(null);
          this.toastService.error(message);
        },
      });
  }

  protected openRemoveMemberModal(member: OrganizationMember): void {
    if (
      !this.canManageMember(member) ||
      this.isRowBusy(member.id) ||
      this.pendingRemoveMember()
    ) {
      return;
    }

    this.pendingRemoveMember.set(member);
  }

  protected closeRemoveMemberModal(): void {
    if (this.isRemovingMember()) {
      return;
    }

    this.pendingRemoveMember.set(null);
  }

  protected confirmRemoveMember(): void {
    const member = this.pendingRemoveMember();
    if (!member || this.isRemovingMember()) {
      return;
    }

    const organization = this.activeOrganization();
    if (!organization) {
      return;
    }

    this.isRemovingMember.set(true);
    this.rowActionMemberId.set(member.id);
    this.rowActionError.set(null);

    this.teamStore
      .removeMember({ organizationId: organization.id, memberId: member.id })
      .pipe(
        finalize(() => {
          this.isRemovingMember.set(false);
          this.rowActionMemberId.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.pendingRemoveMember.set(null);
          this.toastService.success('Team member removed.');
        },
        error: (error: HttpErrorResponse) => {
          const message = this.extractErrorMessage(error);
          this.rowActionError.set(message);
          this.pendingRemoveMember.set(null);
          this.toastService.error(message);
        },
      });
  }

  protected hasAddError(field: 'email', errorCode: string): boolean {
    const control = this.addMemberForm.controls[field];
    return control.touched && control.hasError(errorCode);
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const body = error.error;

    if (body && typeof body === 'object' && 'message' in body) {
      return String(body.message);
    }

    return 'Something went wrong. Please try again.';
  }
}
