import 'dotenv/config';
import { OrganizationRole, PlatformRole, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { hashPassword } from '../src/common/utils/password.util.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

const DEMO_ORG = {
  name: 'Acme Technologies',
  slug: 'acme',
};

const DEMO_TEAM = [
  {
    email: 'admin@acme.dev',
    name: 'Acme Admin',
    role: OrganizationRole.OWNER,
  },
  {
    email: 'manager@acme.dev',
    name: 'Project Manager',
    role: OrganizationRole.ADMIN,
  },
  {
    email: 'member@acme.dev',
    name: 'Team Member',
    role: OrganizationRole.MEMBER,
  },
  {
    email: 'viewer@acme.dev',
    name: 'Read-only Viewer',
    role: OrganizationRole.VIEWER,
  },
] as const;

async function seedSuperadmin(): Promise<void> {
  const email = process.env.SUPERADMIN_EMAIL?.toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!email || !password) {
    console.log(
      'Skipping superadmin seed: set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD',
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.platformRole !== PlatformRole.SUPERADMIN) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { platformRole: PlatformRole.SUPERADMIN },
      });
      console.log(`Promoted existing user ${email} to superadmin`);
      return;
    }

    console.log(`Superadmin ${email} already exists`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name: process.env.SUPERADMIN_NAME ?? 'Super Admin',
      passwordHash: await hashPassword(password),
      platformRole: PlatformRole.SUPERADMIN,
    },
  });

  console.log(`Superadmin ${email} created`);
}

async function seedDemoTeam(): Promise<void> {
  const password = process.env.DEMO_PASSWORD;

  if (!password) {
    console.log('Skipping demo team seed: set DEMO_PASSWORD');
    return;
  }

  const passwordHash = await hashPassword(password);

  const organization = await prisma.organization.upsert({
    where: { slug: DEMO_ORG.slug },
    update: { name: DEMO_ORG.name },
    create: DEMO_ORG,
  });

  for (const persona of DEMO_TEAM) {
    const email = persona.email.toLowerCase();

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: persona.name,
        passwordHash,
      },
      create: {
        email,
        name: persona.name,
        passwordHash,
      },
    });

    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
      update: { role: persona.role },
      create: {
        organizationId: organization.id,
        userId: user.id,
        role: persona.role,
      },
    });

    console.log(`Demo user ${email} (${persona.role}) ready`);
  }

  await seedDemoNotifications(organization.id);
}

async function seedDemoNotifications(organizationId: string): Promise<void> {
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@acme.dev' },
  });

  if (!admin) {
    return;
  }

  const existingCount = await prisma.notification.count({
    where: { userId: admin.id },
  });

  if (existingCount > 0) {
    console.log('Demo notifications already exist');
    return;
  }

  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        type: 'TASK_ASSIGNED',
        title: 'Task assigned to you',
        body: 'You were assigned to "Design landing page hero".',
        metadata: {
          organizationId,
          projectId: null,
          taskId: null,
        },
      },
      {
        userId: admin.id,
        type: 'MENTION',
        title: 'You were mentioned',
        body: '@admin please review the mobile breakpoints.',
        metadata: {
          organizationId,
          taskId: null,
        },
      },
      {
        userId: admin.id,
        type: 'TASK_DUE_SOON',
        title: 'Task due soon',
        body: '"Ship onboarding flow" is due within 24 hours.',
        readAt: new Date(),
        metadata: {
          organizationId,
          taskId: null,
        },
      },
    ],
  });

  console.log('Demo notifications seeded for admin@acme.dev');
}

async function main() {
  await seedSuperadmin();
  await seedDemoTeam();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
