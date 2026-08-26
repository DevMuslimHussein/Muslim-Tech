import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import type { CreateLectureDto } from './dto/create-lecture.dto';
import type { UpdateLectureDto } from './dto/update-lecture.dto';
import { extractYoutubeId } from './youtube.js';

@Injectable()
export class LecturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async findPublishedById(id: string) {
    const lecture = await this.prisma.lecture.findFirst({
      where: { id, status: 'published' },
      include: {
        chapter: { include: { subject: true } },
        files: { orderBy: { order: 'asc' } },
      },
    });
    if (!lecture) {
      throw new NotFoundException('المحاضرة غير موجودة');
    }
    return lecture;
  }

  async findByIdForAdmin(id: string) {
    const lecture = await this.prisma.lecture.findUnique({
      where: { id },
      include: { files: { orderBy: { order: 'asc' } } },
    });
    if (!lecture) {
      throw new NotFoundException('المحاضرة غير موجودة');
    }
    return lecture;
  }

  async listForAdmin(chapterId?: string) {
    return this.prisma.lecture.findMany({
      where: chapterId ? { chapterId } : undefined,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        files: true,
        chapter: { include: { subject: true } },
      },
    });
  }

  async listRecentPublished(take = 10) {
    return this.prisma.lecture.findMany({
      where: { status: 'published' },
      orderBy: { publishAt: 'desc' },
      take,
      include: { chapter: { include: { subject: true } } },
    });
  }

  create(dto: CreateLectureDto) {
    return this.prisma.lecture.create({
      data: {
        chapterId: dto.chapterId,
        title: dto.title,
        description: dto.description,
        number: dto.number,
        status: dto.status ?? 'draft',
        publishAt: dto.publishAt ? new Date(dto.publishAt) : undefined,
        youtubeId: dto.youtubeUrl
          ? this.parseYoutube(dto.youtubeUrl)
          : undefined,
      },
    });
  }

  async update(id: string, dto: UpdateLectureDto) {
    await this.findByIdForAdmin(id);
    const { youtubeUrl, ...rest } = dto;
    return this.prisma.lecture.update({
      where: { id },
      data: {
        ...rest,
        publishAt: dto.publishAt ? new Date(dto.publishAt) : undefined,
        // An empty string is how the admin form clears the link.
        ...(youtubeUrl !== undefined
          ? { youtubeId: youtubeUrl.trim() ? this.parseYoutube(youtubeUrl) : null }
          : {}),
      },
    });
  }

  private parseYoutube(input: string): string {
    const id = extractYoutubeId(input);
    if (!id) {
      throw new BadRequestException('رابط يوتيوب غير صالح');
    }
    return id;
  }

  async publish(id: string, actorId?: string) {
    await this.findByIdForAdmin(id);
    const lecture = await this.prisma.lecture.update({
      where: { id },
      data: { status: 'published', publishAt: new Date() },
      include: { chapter: { include: { subject: true } } },
    });

    await this.notifications.create({
      title: 'محاضرة جديدة',
      body: `${lecture.chapter.subject.name} — ${lecture.title}`,
      type: 'lecture',
      audience: 'all',
      deepLink: `/lectures/${lecture.id}`,
      createdById: actorId,
    });

    this.audit.record(
      actorId ?? null,
      'lecture.publish',
      'lecture',
      lecture.id,
      {
        title: lecture.title,
      },
    );

    return lecture;
  }

  async setThumbnail(id: string, thumbnailUrl: string) {
    const lecture = await this.findByIdForAdmin(id);
    if (lecture.thumbnailUrl) {
      await this.storage.deletePublic(lecture.thumbnailUrl);
    }
    return this.prisma.lecture.update({
      where: { id },
      data: { thumbnailUrl },
    });
  }

  async setVideo(id: string, storedPath: string) {
    const lecture = await this.findByIdForAdmin(id);
    if (lecture.videoAssetId) {
      await this.storage.deleteProtected(lecture.videoAssetId);
    }
    return this.prisma.lecture.update({
      where: { id },
      data: { videoAssetId: storedPath },
    });
  }

  async addFile(
    lectureId: string,
    file: {
      fileName: string;
      storedPath: string;
      fileType: string;
      fileSize: number;
    },
    isDownloadable: boolean,
  ) {
    await this.findByIdForAdmin(lectureId);
    const count = await this.prisma.lectureFile.count({ where: { lectureId } });
    return this.prisma.lectureFile.create({
      data: {
        lectureId,
        fileName: file.fileName,
        fileUrl: file.storedPath,
        fileType: file.fileType,
        fileSize: file.fileSize,
        isDownloadable,
        order: count,
      },
    });
  }

  async removeFile(fileId: string) {
    const file = await this.prisma.lectureFile.findUnique({
      where: { id: fileId },
    });
    if (!file) {
      throw new NotFoundException('الملف غير موجود');
    }
    await this.storage.deleteProtected(file.fileUrl);
    await this.prisma.lectureFile.delete({ where: { id: fileId } });
  }

  async remove(id: string) {
    const lecture = await this.findByIdForAdmin(id);
    if (lecture.thumbnailUrl) {
      await this.storage.deletePublic(lecture.thumbnailUrl);
    }
    if (lecture.videoAssetId) {
      await this.storage.deleteProtected(lecture.videoAssetId);
    }
    for (const file of lecture.files) {
      await this.storage.deleteProtected(file.fileUrl);
    }
    await this.prisma.lecture.delete({ where: { id } });
  }

  async getVideoStoredPath(lectureId: string): Promise<string> {
    const lecture = await this.prisma.lecture.findFirst({
      where: { id: lectureId, status: 'published' },
    });
    if (!lecture?.videoAssetId) {
      throw new BadRequestException('لا يوجد فيديو لهذه المحاضرة');
    }
    return lecture.videoAssetId;
  }
}
