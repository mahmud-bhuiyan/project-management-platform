import 'dotenv/config';
import {
  OrganizationRole,
  PlatformRole,
  PrismaClient,
  ProjectPriority,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';
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

type DemoUserKey = 'admin' | 'manager' | 'member' | 'viewer';

const DEMO_USER_EMAILS: Record<DemoUserKey, string> = {
  admin: 'admin@acme.dev',
  manager: 'manager@acme.dev',
  member: 'member@acme.dev',
  viewer: 'viewer@acme.dev',
};

const DEMO_USER_ROLES: Record<DemoUserKey, OrganizationRole> = {
  admin: OrganizationRole.OWNER,
  manager: OrganizationRole.ADMIN,
  member: OrganizationRole.MEMBER,
  viewer: OrganizationRole.VIEWER,
};

interface DemoCommentSeed {
  author: DemoUserKey;
  body: string;
}

interface DemoTaskSeed {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: DemoUserKey;
  reporter: DemoUserKey;
  dueInDays?: number;
  position: number;
  comments?: DemoCommentSeed[];
}

interface DemoProjectSeed {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  owner: DemoUserKey;
  startInDays?: number;
  dueInDays?: number;
  memberKeys: DemoUserKey[];
  tasks: DemoTaskSeed[];
}

const DEMO_PROJECTS: DemoProjectSeed[] = [
  {
    name: 'CRM Development',
    description:
      'Customer relationship platform with lead pipeline, contact sync, and sales reporting.',
    status: ProjectStatus.ACTIVE,
    priority: ProjectPriority.HIGH,
    owner: 'manager',
    startInDays: -30,
    dueInDays: 45,
    memberKeys: ['admin', 'manager', 'member'],
    tasks: [
      {
        title: 'Define contact schema and pipeline stages',
        description: 'Align sales stages with the existing Acme funnel.',
        status: TaskStatus.BACKLOG,
        priority: TaskPriority.HIGH,
        assignee: 'manager',
        reporter: 'admin',
        dueInDays: 14,
        position: 0,
      },
      {
        title: 'Build lead import API endpoint',
        description: 'CSV upload with validation and duplicate detection.',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        assignee: 'member',
        reporter: 'manager',
        dueInDays: 7,
        position: 0,
        comments: [
          {
            author: 'manager',
            body: 'Start with CSV only — Salesforce sync can follow in v2.',
          },
        ],
      },
      {
        title: 'Implement opportunity kanban view',
        description: 'Drag-and-drop board for open deals by stage.',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        assignee: 'member',
        reporter: 'manager',
        dueInDays: 5,
        position: 0,
        comments: [
          {
            author: 'member',
            body: 'Column reorder works locally; wiring realtime updates next.',
          },
          {
            author: 'admin',
            body: 'Looks good — keep stage labels consistent with the schema doc.',
          },
        ],
      },
      {
        title: 'Add email sync for contact updates',
        status: TaskStatus.REVIEW,
        priority: TaskPriority.MEDIUM,
        assignee: 'member',
        reporter: 'admin',
        dueInDays: 3,
        position: 0,
      },
      {
        title: 'Ship onboarding flow for sales reps',
        status: TaskStatus.DONE,
        priority: TaskPriority.LOW,
        assignee: 'manager',
        reporter: 'admin',
        dueInDays: -2,
        position: 0,
      },
    ],
  },
  {
    name: 'Website Redesign',
    description:
      'Marketing site refresh with updated IA, hero redesign, and accessibility pass.',
    status: ProjectStatus.ACTIVE,
    priority: ProjectPriority.MEDIUM,
    owner: 'admin',
    startInDays: -14,
    dueInDays: 30,
    memberKeys: ['admin', 'manager', 'member', 'viewer'],
    tasks: [
      {
        title: 'Audit current site IA and user flows',
        status: TaskStatus.DONE,
        priority: TaskPriority.MEDIUM,
        assignee: 'manager',
        reporter: 'admin',
        dueInDays: -10,
        position: 0,
      },
      {
        title: 'Design landing page hero',
        description: 'Desktop and mobile variants for the new brand direction.',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        assignee: 'member',
        reporter: 'manager',
        dueInDays: 4,
        position: 0,
        comments: [
          {
            author: 'member',
            body: '@admin please review the mobile breakpoints before we hand off to dev.',
          },
        ],
      },
      {
        title: 'Build responsive navigation component',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        assignee: 'member',
        reporter: 'admin',
        dueInDays: 10,
        position: 0,
      },
      {
        title: 'Write accessibility checklist for QA',
        status: TaskStatus.BACKLOG,
        priority: TaskPriority.LOW,
        assignee: 'manager',
        reporter: 'admin',
        dueInDays: 21,
        position: 0,
      },
      {
        title: 'Mobile breakpoint review',
        status: TaskStatus.REVIEW,
        priority: TaskPriority.HIGH,
        assignee: 'admin',
        reporter: 'manager',
        dueInDays: 2,
        position: 0,
        comments: [
          {
            author: 'viewer',
            body: 'Tablet layout looks fine; small phones need tighter spacing on the CTA.',
          },
        ],
      },
    ],
  },
  {
    name: 'Mobile Application',
    description: 'Native companion app for task updates, push alerts, and offline drafts.',
    status: ProjectStatus.PLANNING,
    priority: ProjectPriority.MEDIUM,
    owner: 'admin',
    startInDays: 7,
    dueInDays: 90,
    memberKeys: ['admin', 'manager', 'member'],
    tasks: [
      {
        title: 'Research push notification providers',
        status: TaskStatus.BACKLOG,
        priority: TaskPriority.LOW,
        reporter: 'manager',
        dueInDays: 20,
        position: 0,
      },
      {
        title: 'Define MVP feature list',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        assignee: 'manager',
        reporter: 'admin',
        dueInDays: 14,
        position: 0,
      },
      {
        title: 'Create wireframes for task list screen',
        status: TaskStatus.BACKLOG,
        priority: TaskPriority.MEDIUM,
        assignee: 'member',
        reporter: 'manager',
        dueInDays: 18,
        position: 0,
      },
    ],
  },
];

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date;
}

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

async function seedDemoTeam(): Promise<string | null> {
  const password = process.env.DEMO_PASSWORD;

  if (!password) {
    console.log('Skipping demo team seed: set DEMO_PASSWORD');
    return null;
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

  return organization.id;
}

async function getDemoUserMap(): Promise<Map<DemoUserKey, string>> {
  const entries = await Promise.all(
    (Object.entries(DEMO_USER_EMAILS) as [DemoUserKey, string][]).map(
      async ([key, email]) => {
        const user = await prisma.user.findUniqueOrThrow({
          where: { email: email.toLowerCase() },
        });
        return [key, user.id] as const;
      },
    ),
  );

  return new Map(entries);
}

async function seedDemoProjectsAndTasks(
  organizationId: string,
): Promise<void> {
  const users = await getDemoUserMap();

  for (const projectSeed of DEMO_PROJECTS) {
    const existingProject = await prisma.project.findFirst({
      where: { organizationId, name: projectSeed.name },
      select: { id: true },
    });

    if (existingProject) {
      console.log(`Demo project "${projectSeed.name}" already exists — skipping`);
      continue;
    }

    const ownerId = users.get(projectSeed.owner);
    if (!ownerId) {
      throw new Error(`Missing demo user for project owner: ${projectSeed.owner}`);
    }

    const project = await prisma.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          organizationId,
          name: projectSeed.name,
          description: projectSeed.description,
          status: projectSeed.status,
          priority: projectSeed.priority,
          ownerId,
          startDate:
            projectSeed.startInDays !== undefined
              ? daysFromNow(projectSeed.startInDays)
              : undefined,
          dueDate:
            projectSeed.dueInDays !== undefined
              ? daysFromNow(projectSeed.dueInDays)
              : undefined,
        },
      });

      for (const memberKey of projectSeed.memberKeys) {
        const memberId = users.get(memberKey);
        if (!memberId) {
          continue;
        }

        await tx.projectMember.create({
          data: {
            projectId: createdProject.id,
            userId: memberId,
            role:
              memberKey === projectSeed.owner
                ? OrganizationRole.OWNER
                : DEMO_USER_ROLES[memberKey],
          },
        });
      }

      for (const taskSeed of projectSeed.tasks) {
        const reporterId = users.get(taskSeed.reporter);
        if (!reporterId) {
          throw new Error(`Missing demo user for reporter: ${taskSeed.reporter}`);
        }

        const task = await tx.task.create({
          data: {
            projectId: createdProject.id,
            title: taskSeed.title,
            description: taskSeed.description ?? '',
            status: taskSeed.status,
            priority: taskSeed.priority,
            assigneeId: taskSeed.assignee
              ? users.get(taskSeed.assignee)
              : undefined,
            reporterId,
            dueDate:
              taskSeed.dueInDays !== undefined
                ? daysFromNow(taskSeed.dueInDays)
                : undefined,
            position: taskSeed.position,
          },
        });

        for (const commentSeed of taskSeed.comments ?? []) {
          const authorId = users.get(commentSeed.author);
          if (!authorId) {
            throw new Error(
              `Missing demo user for comment author: ${commentSeed.author}`,
            );
          }

          await tx.comment.create({
            data: {
              taskId: task.id,
              authorId,
              body: commentSeed.body,
            },
          });
        }
      }

      return createdProject;
    });

    console.log(
      `Demo project "${project.name}" seeded with ${projectSeed.tasks.length} tasks`,
    );
  }
}

async function seedDemoNotifications(organizationId: string): Promise<void> {
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@acme.dev' },
  });

  if (!admin) {
    return;
  }

  const heroTask = await prisma.task.findFirst({
    where: {
      title: 'Design landing page hero',
      project: { organizationId },
    },
    select: { id: true, projectId: true },
  });

  const onboardingTask = await prisma.task.findFirst({
    where: {
      title: 'Ship onboarding flow for sales reps',
      project: { organizationId },
    },
    select: { id: true, projectId: true },
  });

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
          projectId: heroTask?.projectId ?? null,
          taskId: heroTask?.id ?? null,
        },
      },
      {
        userId: admin.id,
        type: 'MENTION',
        title: 'You were mentioned',
        body: '@admin please review the mobile breakpoints.',
        metadata: {
          organizationId,
          projectId: heroTask?.projectId ?? null,
          taskId: heroTask?.id ?? null,
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
          projectId: onboardingTask?.projectId ?? null,
          taskId: onboardingTask?.id ?? null,
        },
      },
    ],
  });

  console.log('Demo notifications seeded for admin@acme.dev');
}

async function main() {
  await seedSuperadmin();
  const organizationId = await seedDemoTeam();

  if (organizationId) {
    await seedDemoProjectsAndTasks(organizationId);
    await seedDemoNotifications(organizationId);
  }
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
