-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "name" TEXT,
ALTER COLUMN "username" DROP NOT NULL;
