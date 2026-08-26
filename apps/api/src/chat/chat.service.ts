import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MESSAGE_SELECT = {
  id: true,
  body: true,
  fromAdmin: true,
  createdAt: true,
  sender: { select: { id: true, fullName: true, avatarUrl: true } },
} as const;

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- student

  /** Every student has exactly one thread with the administration. */
  private async ensureConversation(studentId: string) {
    return this.prisma.conversation.upsert({
      where: { studentId },
      update: {},
      create: { studentId },
      select: { id: true },
    });
  }

  async studentThread(studentId: string, since?: string) {
    const conversation = await this.ensureConversation(studentId);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        ...(since ? { createdAt: { gt: new Date(since) } } : {}),
      },
      select: MESSAGE_SELECT,
      orderBy: { createdAt: 'asc' },
      take: since ? 100 : 300,
    });

    // Opening the thread is what marks it read — do it only on a full load so
    // a background poll can't clear the badge while the student is elsewhere.
    if (!since) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { studentUnread: 0 },
      });
    }

    return { conversationId: conversation.id, messages };
  }

  async studentUnreadCount(studentId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { studentId },
      select: { studentUnread: true },
    });
    return { unread: conversation?.studentUnread ?? 0 };
  }

  async sendAsStudent(studentId: string, body: string) {
    const conversation = await this.ensureConversation(studentId);
    return this.appendMessage(conversation.id, studentId, false, body);
  }

  // ------------------------------------------------------------------ admin

  async listConversations(search?: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: search
        ? {
            student: {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : undefined,
      select: {
        id: true,
        lastMessageAt: true,
        lastMessagePreview: true,
        adminUnread: true,
        student: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
            status: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 200,
    });

    // A thread that was auto-created but never used is noise in the inbox.
    return conversations.filter((c) => c.lastMessagePreview !== null);
  }

  async adminUnreadTotal() {
    const result = await this.prisma.conversation.aggregate({
      _sum: { adminUnread: true },
      _count: { _all: true },
      where: { adminUnread: { gt: 0 } },
    });
    return {
      unread: result._sum.adminUnread ?? 0,
      threads: result._count._all,
    };
  }

  async adminThread(conversationId: string, since?: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        student: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
            email: true,
            status: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('المحادثة غير موجودة');
    }

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(since ? { createdAt: { gt: new Date(since) } } : {}),
      },
      select: MESSAGE_SELECT,
      orderBy: { createdAt: 'asc' },
      take: since ? 100 : 300,
    });

    if (!since) {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { adminUnread: 0 },
      });
    }

    return { conversationId, student: conversation.student, messages };
  }

  async sendAsAdmin(adminId: string, conversationId: string, body: string) {
    const exists = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('المحادثة غير موجودة');
    }
    return this.appendMessage(conversationId, adminId, true, body);
  }

  /** Starts (or reuses) the thread for a student the admin picked from a list. */
  async openThreadWithStudent(studentId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true },
    });
    if (!student || student.role !== 'student') {
      throw new NotFoundException('الطالب غير موجود');
    }
    const conversation = await this.ensureConversation(studentId);
    return { conversationId: conversation.id };
  }

  // ----------------------------------------------------------------- shared

  private async appendMessage(
    conversationId: string,
    senderId: string,
    fromAdmin: boolean,
    body: string,
  ) {
    const trimmed = body.trim();
    if (!trimmed) {
      throw new ForbiddenException('الرسالة فارغة');
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, senderId, fromAdmin, body: trimmed },
        select: MESSAGE_SELECT,
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: trimmed.slice(0, 140),
          ...(fromAdmin
            ? { studentUnread: { increment: 1 } }
            : { adminUnread: { increment: 1 } }),
        },
      }),
    ]);

    return message;
  }
}
