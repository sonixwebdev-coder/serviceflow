-- CreateEnum
CREATE TYPE "PersonalTodoPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "PersonalTodo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "priority" "PersonalTodoPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalTodo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalTodo_userId_isCompleted_idx" ON "PersonalTodo"("userId", "isCompleted");

-- CreateIndex
CREATE INDEX "PersonalTodo_userId_dueDate_idx" ON "PersonalTodo"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "PersonalTodo_dueDate_idx" ON "PersonalTodo"("dueDate");

-- AddForeignKey
ALTER TABLE "PersonalTodo" ADD CONSTRAINT "PersonalTodo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
