import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { CreateSubjectDto } from './dto/create-subject.dto';
import type { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async listPublished() {
    const subjects = await this.prisma.subject.findMany({
      where: { isPublished: true },
      orderBy: { order: 'asc' },
      include: { _count: { select: { chapters: true } } },
    });

    return Promise.all(
      subjects.map(async (subject) => ({
        ...subject,
        lectureCount: await this.prisma.lecture.count({
          where: { chapter: { subjectId: subject.id }, status: 'published' },
        }),
      })),
    );
  }

  async listAllForAdmin() {
    return this.prisma.subject.findMany({ orderBy: { order: 'asc' } });
  }

  async findPublishedById(id: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, isPublished: true },
    });
    if (!subject) {
      throw new NotFoundException('المادة غير موجودة');
    }
    return subject;
  }

  async findByIdForAdmin(id: string) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) {
      throw new NotFoundException('المادة غير موجودة');
    }
    return subject;
  }

  async chaptersWithLectures(subjectId: string, publishedOnly: boolean) {
    return this.prisma.chapter.findMany({
      where: { subjectId },
      orderBy: { order: 'asc' },
      include: {
        lectures: {
          where: publishedOnly ? { status: 'published' } : undefined,
          orderBy: { number: 'asc' },
        },
      },
    });
  }

  create(dto: CreateSubjectDto) {
    return this.prisma.subject.create({ data: dto });
  }

  async update(id: string, dto: UpdateSubjectDto) {
    await this.findByIdForAdmin(id);
    return this.prisma.subject.update({ where: { id }, data: dto });
  }

  async setIcon(id: string, iconUrl: string) {
    const subject = await this.findByIdForAdmin(id);
    if (subject.iconUrl) {
      await this.storage.deletePublic(subject.iconUrl);
    }
    return this.prisma.subject.update({ where: { id }, data: { iconUrl } });
  }

  async remove(id: string) {
    const subject = await this.findByIdForAdmin(id);
    if (subject.iconUrl) {
      await this.storage.deletePublic(subject.iconUrl);
    }
    await this.prisma.subject.delete({ where: { id } });
  }
}
