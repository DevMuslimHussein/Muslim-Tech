import { Injectable } from '@nestjs/common';
import type {
  NotificationAudience,
  NotificationType,
} from '@muslim-tech/types';
import { PrismaService } from '../prisma/prisma.service';

interface CreateNotificationInput {
  title: string;
  body: string;
  type: NotificationType;
  audience: NotificationAudience;
  targetUserId?: string;
  deepLink?: string;
  createdById?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateNotificationInput) {
    return this.prisma.notification.create({ data: input });
  }

  /** Notifications visible to a user: broadcast, or addressed to them directly. */
  private audienceFilter(userId: string) {
    return {
      OR: [{ audience: 'all' as const }, { targetUserId: userId }],
    };
  }

  async listForUser(userId: string, take = 50) {
    const notifications = await this.prisma.notification.findMany({
      where: this.audienceFilter(userId),
      orderBy: { createdAt: 'desc' },
      take,
      include: { reads: { where: { userId } } },
    });

    return notifications.map(({ reads, ...notification }) => ({
      ...notification,
      isRead: reads.length > 0 && reads[0]?.readAt !== null,
    }));
  }

  async unreadCount(userId: string) {
    const [total, read] = await Promise.all([
      this.prisma.notification.count({ where: this.audienceFilter(userId) }),
      this.prisma.notificationRead.count({
        where: {
          userId,
          readAt: { not: null },
          notification: this.audienceFilter(userId),
        },
      }),
    ]);
    return { count: Math.max(total - read, 0) };
  }

  async markRead(userId: string, notificationId: string) {
    await this.prisma.notificationRead.upsert({
      where: { notificationId_userId: { notificationId, userId } },
      create: { notificationId, userId, readAt: new Date() },
      update: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: this.audienceFilter(userId),
      select: { id: true },
    });

    await this.prisma.$transaction(
      notifications.map((notification) =>
        this.prisma.notificationRead.upsert({
          where: {
            notificationId_userId: { notificationId: notification.id, userId },
          },
          create: {
            notificationId: notification.id,
            userId,
            readAt: new Date(),
          },
          update: { readAt: new Date() },
        }),
      ),
    );
  }

  listForAdmin(take = 100) {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: { targetUser: { select: { fullName: true, username: true } } },
    });
  }

  async remove(id: string) {
    await this.prisma.notification.delete({ where: { id } });
  }
}
