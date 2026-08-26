-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lecture_id" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'default',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_preview" TEXT,
    "student_unread" INTEGER NOT NULL DEFAULT 0,
    "admin_unread" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT,
    "from_admin" BOOLEAN NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notes_user_id_updated_at_idx" ON "notes"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "notes_user_id_lecture_id_idx" ON "notes"("user_id", "lecture_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_student_id_key" ON "conversations"("student_id");

-- CreateIndex
CREATE INDEX "conversations_last_message_at_idx" ON "conversations"("last_message_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_lecture_id_fkey" FOREIGN KEY ("lecture_id") REFERENCES "lectures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
