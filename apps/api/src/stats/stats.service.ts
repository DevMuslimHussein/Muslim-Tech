import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface DayCount {
  day: Date;
  count: bigint;
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const now = new Date();
    const [
      students,
      activeStudents,
      subjects,
      chapters,
      lectures,
      publishedLectures,
      announcements,
      files,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'student' } }),
      this.prisma.user.count({ where: { role: 'student', status: 'active' } }),
      this.prisma.subject.count(),
      this.prisma.chapter.count(),
      this.prisma.lecture.count(),
      this.prisma.lecture.count({ where: { status: 'published' } }),
      this.prisma.announcement.count({
        where: {
          isActive: true,
          publishAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      this.prisma.lectureFile.count(),
    ]);

    return {
      students,
      activeStudents,
      suspendedStudents: students - activeStudents,
      subjects,
      chapters,
      lectures,
      publishedLectures,
      draftLectures: lectures - publishedLectures,
      announcements,
      files,
    };
  }

  /** Student signups per day over the trailing `days` window, zero-filled. */
  async signupsSeries(days = 14) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const rows = await this.prisma.$queryRaw<DayCount[]>`
      SELECT date_trunc('day', "created_at") AS day, COUNT(*)::bigint AS count
      FROM "users"
      WHERE "role" = 'student' AND "created_at" >= ${since}
      GROUP BY day
      ORDER BY day
    `;

    return zeroFill(rows, since, days);
  }

  /** Lecture publishes per day over the trailing `days` window, zero-filled. */
  async publishesSeries(days = 14) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const rows = await this.prisma.$queryRaw<DayCount[]>`
      SELECT date_trunc('day', "publish_at") AS day, COUNT(*)::bigint AS count
      FROM "lectures"
      WHERE "status" = 'published' AND "publish_at" >= ${since}
      GROUP BY day
      ORDER BY day
    `;

    return zeroFill(rows, since, days);
  }

  /** Lecture counts per subject, for the dashboard bar chart. */
  async lecturesBySubject() {
    const subjects = await this.prisma.subject.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, name: true },
    });

    return Promise.all(
      subjects.map(async (subject) => ({
        ...subject,
        lectures: await this.prisma.lecture.count({
          where: { chapter: { subjectId: subject.id }, status: 'published' },
        }),
      })),
    );
  }

  recentStudents(take = 5) {
    return this.prisma.user.findMany({
      where: { role: 'student' },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }
}

function zeroFill(rows: DayCount[], since: Date, days: number) {
  const byDay = new Map(
    rows.map((row) => [row.day.toISOString().slice(0, 10), Number(row.count)]),
  );

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(since);
    date.setUTCDate(since.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { date: key, count: byDay.get(key) ?? 0 };
  });
}
