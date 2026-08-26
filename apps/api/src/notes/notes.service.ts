import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateNoteDto } from './dto/create-note.dto';
import type { UpdateNoteDto } from './dto/update-note.dto';

const NOTE_SELECT = {
  id: true,
  title: true,
  content: true,
  color: true,
  isPinned: true,
  lectureId: true,
  createdAt: true,
  updatedAt: true,
  lecture: {
    select: {
      id: true,
      title: true,
      number: true,
      chapter: { select: { id: true, title: true } },
    },
  },
} as const;

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, lectureId?: string, search?: string) {
    return this.prisma.note.findMany({
      where: {
        userId,
        ...(lectureId ? { lectureId } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' as const } },
                { content: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: NOTE_SELECT,
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async create(userId: string, dto: CreateNoteDto) {
    // Silently drop a lectureId the student can't actually see, so a stale or
    // guessed id becomes a plain note instead of a foreign-key error.
    let lectureId: string | null = null;
    if (dto.lectureId) {
      const lecture = await this.prisma.lecture.findFirst({
        where: { id: dto.lectureId, status: 'published' },
        select: { id: true },
      });
      lectureId = lecture?.id ?? null;
    }

    return this.prisma.note.create({
      data: {
        userId,
        lectureId,
        title: dto.title.trim(),
        content: dto.content,
        color: dto.color ?? 'default',
        isPinned: dto.isPinned ?? false,
      },
      select: NOTE_SELECT,
    });
  }

  async update(userId: string, id: string, dto: UpdateNoteDto) {
    await this.assertOwned(userId, id);
    return this.prisma.note.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.isPinned !== undefined ? { isPinned: dto.isPinned } : {}),
      },
      select: NOTE_SELECT,
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.note.delete({ where: { id } });
  }

  private async assertOwned(userId: string, id: string) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!note || note.userId !== userId) {
      throw new NotFoundException('الملاحظة غير موجودة');
    }
  }
}
