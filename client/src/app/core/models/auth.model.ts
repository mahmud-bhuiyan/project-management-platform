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
