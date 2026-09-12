-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPERADMIN', 'USER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "platform_role" "PlatformRole" NOT NULL DEFAULT 'USER';
