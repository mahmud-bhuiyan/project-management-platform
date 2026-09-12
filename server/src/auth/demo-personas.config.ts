export interface DemoPersonaDefinition {
  label: string;
  email: string;
}

export const DEMO_PERSONAS: DemoPersonaDefinition[] = [
  { label: 'Superadmin', email: 'superadmin@flowdesk.local' },
  { label: 'Company Admin', email: 'admin@acme.dev' },
  { label: 'Manager', email: 'manager@acme.dev' },
  { label: 'Member', email: 'member@acme.dev' },
];

const DEMO_PERSONA_EMAILS = new Set(
  DEMO_PERSONAS.map((persona) => persona.email.toLowerCase()),
);

export function isDemoLoginEnabled(): boolean {
  return process.env.DEMO_LOGIN_ENABLED !== 'false';
}

export function isDemoPersonaEmail(email: string): boolean {
  return DEMO_PERSONA_EMAILS.has(email.toLowerCase());
}

export function resolveDemoPassword(email: string): string | null {
  const normalizedEmail = email.toLowerCase();
  const superadminEmail = process.env.SUPERADMIN_EMAIL?.toLowerCase();

  if (superadminEmail && normalizedEmail === superadminEmail) {
    return process.env.SUPERADMIN_PASSWORD ?? null;
  }

  if (DEMO_PERSONA_EMAILS.has(normalizedEmail)) {
    return process.env.DEMO_PASSWORD ?? null;
  }

  return null;
}
