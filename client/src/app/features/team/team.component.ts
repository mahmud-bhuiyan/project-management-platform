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
import { OrganizationService } from '../../core/services/organization.service';
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
  private readonly organizationService = inject(OrganizationService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly activeOrganization = this.organizationService.activeOrganization;
  protected readonly members = signal<OrganizationMember[]>([]);
  protected readonly isLoadingMembers = signal(false);
  protected readonly membersError = signal<string | null>(null);
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

  protected readonly isRoleChangeModalOpen = computed(
    () => this.pendingRoleChange() !== null,
  );

  protected readonly roleChangeModalDescription = computed(() => {
    const pending = this.pendingRoleChange();
    if (!pending) {
      return null;
    }

    return `You changed ${pending.member.user.name}'s role from ${this.roleLabel(pending.previousRole)} to ${this.roleLabel(pending.nextRole)}. Was this intentional?`;
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

  protected readonly memberColumns = computed<DataTableColumn[]>(() => {
    if (this.canManage()) {
      return [
        { id: 'member', label: 'Member', widthPercent: 25, cellAlign: 'left' },
        { id: 'email', label: 'Email', widthPercent: 28, cellAlign: 'center' },
        { id: 'role', label: 'Role', widthPercent: 17, cellAlign: 'center' },
        { id: 'joined', label: 'Joined', widthPercent: 15, cellAlign: 'center' },
        { id: 'actions', label: 'Actions', widthPercent: 15, cellAlign: 'center' },
      ];
    }

    return [
      { id: 'member', label: 'Member', widthPercent: 28, cellAlign: 'left' },
      { id: 'email', label: 'Email', widthPercent: 28, cellAlign: 'center' },
      { id: 'role', label: 'Role', widthPercent: 22, cellAlign: 'center' },
      { id: 'joined', label: 'Joined', widthPercent: 22, cellAlign: 'center' },
    ];
  });

  protected readonly addMemberForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    role: this.formBuilder.control<OrganizationRole>('MEMBER'),
  });

  constructor() {
    effect((onCleanup) => {
      const organization = this.activeOrganization();

      if (!organization) {
        this.members.set([]);
        this.membersError.set(null);
        this.searchQuery.set('');
        this.currentPage.set(1);
        return;
      }

      const subscription = this.loadMembers(organization.id);
      onCleanup(() => subscription.unsubscribe());
    });

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

    this.organizationService
      .addMember(organization.id, { email, role })
      .pipe(finalize(() => this.isAddingMember.set(false)))
      .subscribe({
        next: (member) => {
          this.members.update((current) => [...current, member]);
          this.isAddMemberModalOpen.set(false);
          this.addMemberForm.reset({ email: '', role: 'MEMBER' });
        },
        error: (error: HttpErrorResponse) => {
          this.addMemberError.set(this.extractErrorMessage(error));
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

    this.organizationService
      .updateMemberRole(organization.id, member.id, nextRole)
      .pipe(
        finalize(() => {
          this.isConfirmingRoleChange.set(false);
          this.rowActionMemberId.set(null);
        }),
      )
      .subscribe({
        next: (updatedMember) => {
          this.members.update((current) =>
            current.map((item) => (item.id === updatedMember.id ? updatedMember : item)),
          );
          this.pendingRoleChange.set(null);
        },
        error: (error: HttpErrorResponse) => {
          this.rowActionError.set(this.extractErrorMessage(error));
          this.pendingRoleChange.set(null);
        },
      });
  }

  protected removeMember(member: OrganizationMember): void {
    if (!this.canManageMember(member) || this.isRowBusy(member.id)) {
      return;
    }

    const organization = this.activeOrganization();
    if (!organization) {
      return;
    }

    this.rowActionMemberId.set(member.id);
    this.rowActionError.set(null);

    this.organizationService
      .removeMember(organization.id, member.id)
      .pipe(finalize(() => this.rowActionMemberId.set(null)))
      .subscribe({
        next: () => {
          this.members.update((current) => current.filter((item) => item.id !== member.id));
        },
        error: (error: HttpErrorResponse) => {
          this.rowActionError.set(this.extractErrorMessage(error));
        },
      });
  }

  protected hasAddError(field: 'email', errorCode: string): boolean {
    const control = this.addMemberForm.controls[field];
    return control.touched && control.hasError(errorCode);
  }

  private loadMembers(organizationId: string) {
    this.isLoadingMembers.set(true);
    this.membersError.set(null);
    this.searchQuery.set('');
    this.currentPage.set(1);

    return this.organizationService
      .loadMembers(organizationId)
      .pipe(finalize(() => this.isLoadingMembers.set(false)))
      .subscribe({
        next: (members) => this.members.set(members),
        error: (error: HttpErrorResponse) => {
          this.members.set([]);
          this.membersError.set(this.extractErrorMessage(error));
        },
      });
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const body = error.error;

    if (body && typeof body === 'object' && 'message' in body) {
      return String(body.message);
    }

    return 'Something went wrong. Please try again.';
  }
}
