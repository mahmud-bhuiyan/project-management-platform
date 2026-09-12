import 'dotenv/config';
import { PlatformRole, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { hashPassword } from '../src/common/utils/password.util.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
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

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
