-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DOCENTE', 'ADMIN', 'REVISOR');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ACADEMICO', 'TITULO', 'INFORME', 'ACTA', 'GENERADO_IA', 'ESCANEADO', 'OTRO');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('PENDIENTE', 'VALIDADO', 'OBSERVADO');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SUCCESS', 'WARNING', 'INFO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "avatar" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "phone" TEXT,
    "department" TEXT,
    "period" TEXT,
    "initials" TEXT,
    "degree" TEXT,
    "role" "Role" NOT NULL DEFAULT 'DOCENTE',
    "push_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidences" (
    "id" TEXT NOT NULL,
    "docente_id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "periodo" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT,
    "file_size" TEXT,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'PENDIENTE',
    "comment" TEXT,
    "description" TEXT,
    "ia_generated" BOOLEAN NOT NULL DEFAULT false,
    "scanned" BOOLEAN NOT NULL DEFAULT false,
    "indicator_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "docente_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_evidence_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caces_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "caces_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caces_subcategories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "caces_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caces_indicators" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subcategory_id" TEXT NOT NULL,

    CONSTRAINT "caces_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_completed_evidence_id_key" ON "tasks"("completed_evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "caces_categories_code_key" ON "caces_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "caces_subcategories_code_key" ON "caces_subcategories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "caces_indicators_code_key" ON "caces_indicators"("code");

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_docente_id_fkey" FOREIGN KEY ("docente_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_docente_id_fkey" FOREIGN KEY ("docente_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_evidence_id_fkey" FOREIGN KEY ("completed_evidence_id") REFERENCES "evidences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caces_subcategories" ADD CONSTRAINT "caces_subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "caces_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caces_indicators" ADD CONSTRAINT "caces_indicators_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "caces_subcategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
