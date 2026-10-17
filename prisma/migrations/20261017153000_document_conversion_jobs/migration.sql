-- CreateEnum
CREATE TYPE "DocumentConversionStatus" AS ENUM ('WAITING', 'PROCESSING', 'FINISHED', 'ERROR');

-- CreateTable
CREATE TABLE "DocumentConversionJob" (
    "id" TEXT NOT NULL,
    "accessTokenHash" CHAR(64) NOT NULL,
    "providerJobId" TEXT NOT NULL,
    "mode" VARCHAR(20) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "outputFilename" VARCHAR(255),
    "status" "DocumentConversionStatus" NOT NULL DEFAULT 'WAITING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentConversionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentConversionRateLimit" (
    "ipHash" CHAR(64) NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DocumentConversionRateLimit_pkey" PRIMARY KEY ("ipHash")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentConversionJob_accessTokenHash_key" ON "DocumentConversionJob"("accessTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentConversionJob_providerJobId_key" ON "DocumentConversionJob"("providerJobId");

-- CreateIndex
CREATE INDEX "DocumentConversionJob_expiresAt_idx" ON "DocumentConversionJob"("expiresAt");

-- CreateIndex
CREATE INDEX "DocumentConversionRateLimit_windowStartedAt_idx" ON "DocumentConversionRateLimit"("windowStartedAt");
