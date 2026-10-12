-- AlterTable
ALTER TABLE "evidences" ADD COLUMN     "reviewer_name" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "evidence_id" TEXT,
ADD COLUMN     "task_id" TEXT;
