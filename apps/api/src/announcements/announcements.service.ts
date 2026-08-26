import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import type { CreateAnnouncementDto } from './dto/create-announcement.dto';
import type { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  listActive() {
    const now = new Date();
    return this.prisma.announcement.findMany({
      where: {
        isActive: true,
        publishAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { publishAt: 'desc' },
    });
  }

  listForAdmin() {
    return this.prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdForAdmin(id: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
    });
    if (!announcement) {
      throw new NotFoundException('الإعلان غير موجود');
    }
    return announcement;
  }

  async create(dto: CreateAnnouncementDto, createdById: string) {
    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        body: dto.body,
        linkUrl: dto.linkUrl,
        publishAt: dto.publishAt ? new Date(dto.publishAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        createdById,
      },
    });

    await this.notifications.create({
      title: 'إعلان جديد',
      body: announcement.title,
      type: 'announcement',
      audience: 'all',
      deepLink: '/announcements',
      createdById,
    });

    this.audit.record(
      createdById,
      'announcement.create',
      'announcement',
      announcement.id,
      {
        title: announcement.title,
      },
    );

    return announcement;
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    await this.findByIdForAdmin(id);
    return this.prisma.announcement.update({
      where: { id },
      data: {
        ...dto,
        publishAt: dto.publishAt ? new Date(dto.publishAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async setImage(id: string, imageUrl: string) {
    const announcement = await this.findByIdForAdmin(id);
    if (announcement.imageUrl) {
      await this.storage.deletePublic(announcement.imageUrl);
    }
    return this.prisma.announcement.update({
      where: { id },
      data: { imageUrl },
    });
  }

  async remove(id: string) {
    const announcement = await this.findByIdForAdmin(id);
    if (announcement.imageUrl) {
      await this.storage.deletePublic(announcement.imageUrl);
    }
    await this.prisma.announcement.delete({ where: { id } });
  }
}
