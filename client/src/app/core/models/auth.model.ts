import type { Organization } from './organization.model.js';
import type { User } from './user.model.js';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponseData {
  accessToken: string;
  user: User;
}

export interface RefreshResponseData {
  accessToken: string;
}

export interface MeResponseData {
  user: User;
}

export interface DemoPersonasResponseData {
  personas: DemoPersona[];
}

export interface DemoPersona {
  label: string;
  email: string;
}

export interface CreateCompanyAdminRequest {
  email: string;
  name: string;
  password: string;
  organizationName: string;
  organizationSlug: string;
}

export interface CreateCompanyAdminResponseData {
  user: User;
  organization: Organization;
}
