-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('BUG_GLITCH', 'GAMEPLAY_ISSUE', 'UI_MOBILE_ISSUE', 'FEATURE_SUGGESTION', 'GENERAL_FEEDBACK');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'INVESTIGATING', 'PLANNED', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "category" "FeedbackCategory" NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "rating" INTEGER,
    "message" TEXT NOT NULL,
    "page" TEXT,
    "appVersion" TEXT,
    "userAgent" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "viewportWidth" INTEGER,
    "viewportHeight" INTEGER,
    "roomId" TEXT,
    "gameContext" JSONB,
    "userId" TEXT,
    "username" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_status_createdAt_idx" ON "Feedback"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Feedback_category_idx" ON "Feedback"("category");

-- CreateIndex
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
