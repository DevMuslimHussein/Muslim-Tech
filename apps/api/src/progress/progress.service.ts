import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const COMPLETION_THRESHOLD = 0.92;

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async saveProgress(
    userId: string,
    lectureId: string,
    progressSeconds: number,
    durationSeconds: number,
  ) {
    const completed =
      durationSeconds > 0 &&
      progressSeconds / durationSeconds >= COMPLETION_THRESHOLD;

    return this.prisma.watchProgress.upsert({
      where: { userId_lectureId: { userId, lectureId } },
      create: {
        userId,
        lectureId,
        progressSeconds,
        durationSeconds,
        completed,
      },
      update: { progressSeconds, durationSeconds, completed },
    });
  }

  getProgress(userId: string, lectureId: string) {
    return this.prisma.watchProgress.findUnique({
      where: { userId_lectureId: { userId, lectureId } },
    });
  }

  /** Completion percentage per subject, for the student's dashboard. */
  async subjectProgress(userId: string) {
    const subjects = await this.prisma.subject.findMany({
      where: { isPublished: true },
      select: { id: true },
    });

    const entries = await Promise.all(
      subjects.map(async (subject) => {
        const total = await this.prisma.lecture.count({
          where: { chapter: { subjectId: subject.id }, status: 'published' },
        });
        const completed = await this.prisma.watchProgress.count({
          where: {
            userId,
            completed: true,
            lecture: {
              chapter: { subjectId: subject.id },
              status: 'published',
            },
          },
        });
        return [
          subject.id,
          {
            total,
            completed,
            percent: total ? Math.round((completed / total) * 100) : 0,
          },
        ] as const;
      }),
    );

    return Object.fromEntries(entries);
  }

  async continueWatching(userId: string, take = 4) {
    const rows = await this.prisma.watchProgress.findMany({
      where: { userId, completed: false, progressSeconds: { gt: 10 } },
      orderBy: { updatedAt: 'desc' },
      take,
      include: {
        lecture: { include: { chapter: { include: { subject: true } } } },
      },
    });

    return rows.filter((row) => row.lecture.status === 'published');
  }

  listBookmarks(userId: string) {
    return this.prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        lecture: { include: { chapter: { include: { subject: true } } } },
      },
    });
  }

  async isBookmarked(userId: string, lectureId: string) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: { userId_lectureId: { userId, lectureId } },
    });
    return { bookmarked: !!bookmark };
  }

  async toggleBookmark(userId: string, lectureId: string) {
    const existing = await this.prisma.bookmark.findUnique({
      where: { userId_lectureId: { userId, lectureId } },
    });

    if (existing) {
      await this.prisma.bookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }

    await this.prisma.bookmark.create({ data: { userId, lectureId } });
    return { bookmarked: true };
  }
}
