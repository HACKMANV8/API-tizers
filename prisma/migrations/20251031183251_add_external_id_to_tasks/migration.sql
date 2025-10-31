-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "external_id" TEXT;

-- CreateIndex
CREATE INDEX "tasks_user_id_source_external_id_idx" ON "tasks"("user_id", "source", "external_id");
