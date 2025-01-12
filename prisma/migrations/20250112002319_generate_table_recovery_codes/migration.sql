-- CreateTable
CREATE TABLE "recovery_codes" (
    "recoveryCodeId" TEXT NOT NULL,
    "userEmail" VARCHAR(100) NOT NULL,
    "recoveryCode" VARCHAR(10) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recovery_codes_pkey" PRIMARY KEY ("recoveryCodeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "recovery_codes_userEmail_key" ON "recovery_codes"("userEmail");
