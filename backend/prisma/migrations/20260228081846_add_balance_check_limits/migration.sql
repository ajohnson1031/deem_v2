-- CreateTable
CREATE TABLE "GiftCardBalanceCheck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCardBalanceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GiftCardBalanceCheck_userId_createdAt_idx" ON "GiftCardBalanceCheck"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GiftCardBalanceCheck_giftCardId_createdAt_idx" ON "GiftCardBalanceCheck"("giftCardId", "createdAt");

-- AddForeignKey
ALTER TABLE "GiftCardBalanceCheck" ADD CONSTRAINT "GiftCardBalanceCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardBalanceCheck" ADD CONSTRAINT "GiftCardBalanceCheck_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
