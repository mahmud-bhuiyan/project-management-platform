/** Shared demo password — matches server DEMO_PASSWORD / SUPERADMIN_PASSWORD seed. */
export const DEMO_SHARED_PASSWORD = 'User@123';

export interface DemoPersona {
  label: string;
  email: string;
  password: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    label: 'Superadmin',
    email: 'superadmin@flowdesk.local',
    password: DEMO_SHARED_PASSWORD,
  },
  {
    label: 'Company Admin',
    email: 'admin@acme.dev',
    password: DEMO_SHARED_PASSWORD,
  },
  {
    label: 'Manager',
    email: 'manager@acme.dev',
    password: DEMO_SHARED_PASSWORD,
  },
  {
    label: 'Member',
    email: 'member@acme.dev',
    password: DEMO_SHARED_PASSWORD,
  },
];
