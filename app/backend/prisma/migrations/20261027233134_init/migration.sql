-- CreateEnum
CREATE TYPE "Role" AS ENUM ('student', 'staff', 'admin');

-- CreateEnum
CREATE TYPE "CertificationLevel" AS ENUM ('foundational', 'associate', 'professional', 'expert');

-- CreateEnum
CREATE TYPE "PathKind" AS ENUM ('shared', 'specialty');

-- CreateTable
CREATE TABLE "specialties" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hue" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "group" TEXT NOT NULL,
    "specialtyId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'student',
    "classId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hue" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "examCode" TEXT,
    "level" "CertificationLevel" NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "forAllSpecialties" BOOLEAN NOT NULL DEFAULT false,
    "badgeAsset" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "providerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_specialties" (
    "certificationId" UUID NOT NULL,
    "specialtyId" UUID NOT NULL,

    CONSTRAINT "certification_specialties_pkey" PRIMARY KEY ("certificationId","specialtyId")
);

-- CreateTable
CREATE TABLE "certification_domains" (
    "id" UUID NOT NULL,
    "certificationId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" TEXT NOT NULL,
    "weightPct" INTEGER,

    CONSTRAINT "certification_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" UUID NOT NULL,
    "certificationId" UUID NOT NULL,
    "domainId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paths" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PathKind" NOT NULL,
    "specialtyId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "path_nodes" (
    "id" UUID NOT NULL,
    "pathId" UUID NOT NULL,
    "certificationId" UUID NOT NULL,
    "col" INTEGER NOT NULL,
    "row" INTEGER NOT NULL,
    "prerequisiteId" UUID,

    CONSTRAINT "path_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "specialties_code_key" ON "specialties"("code");

-- CreateIndex
CREATE UNIQUE INDEX "classes_code_key" ON "classes"("code");

-- CreateIndex
CREATE INDEX "classes_year_idx" ON "classes"("year");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_classId_idx" ON "users"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "providers_code_key" ON "providers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "certifications_code_key" ON "certifications"("code");

-- CreateIndex
CREATE UNIQUE INDEX "certifications_slug_key" ON "certifications"("slug");

-- CreateIndex
CREATE INDEX "certifications_providerId_idx" ON "certifications"("providerId");

-- CreateIndex
CREATE INDEX "certifications_level_idx" ON "certifications"("level");

-- CreateIndex
CREATE INDEX "certification_specialties_specialtyId_idx" ON "certification_specialties"("specialtyId");

-- CreateIndex
CREATE UNIQUE INDEX "certification_domains_certificationId_order_key" ON "certification_domains"("certificationId", "order");

-- CreateIndex
CREATE INDEX "chapters_domainId_idx" ON "chapters"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_certificationId_order_key" ON "chapters"("certificationId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "paths_code_key" ON "paths"("code");

-- CreateIndex
CREATE UNIQUE INDEX "paths_specialtyId_key" ON "paths"("specialtyId");

-- CreateIndex
CREATE UNIQUE INDEX "path_nodes_pathId_certificationId_key" ON "path_nodes"("pathId", "certificationId");

-- CreateIndex
CREATE UNIQUE INDEX "path_nodes_pathId_col_row_key" ON "path_nodes"("pathId", "col", "row");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_specialties" ADD CONSTRAINT "certification_specialties_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_specialties" ADD CONSTRAINT "certification_specialties_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_domains" ADD CONSTRAINT "certification_domains_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "certification_domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paths" ADD CONSTRAINT "paths_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "path_nodes" ADD CONSTRAINT "path_nodes_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "path_nodes" ADD CONSTRAINT "path_nodes_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "certifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "path_nodes" ADD CONSTRAINT "path_nodes_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "certifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
