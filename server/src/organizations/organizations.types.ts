import type { Organization } from '@prisma/client';
import type { SafeUser } from '../users/users.types.js';

export type CompanyAdminResult = {
  user: SafeUser;
  organization: Organization;
};
