import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateGradeDto } from './dto/create-grade.dto';

export interface GradeItem {
  id: string;
  source: 'exam' | 'manual';
  title: string;
  points: number;
  maxPoints: number;
  percent: number;
  note: string | null;
  date: Date;
}

@Injectable()
export class GradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * A student's marks, merged from two sources: graded exam attempts and
   * marks the admin entered by hand. Grouped by subject with an average.
   */
  async forStudent(userId: string) {
    const [attempts, manual] = await Promise.all([
      this.prisma.examAttempt.findMany({
        where: { userId, submittedAt: { not: null }, needsReview: false },
        select: {
          id: true,
          score: true,
          earnedPoints: true,
          totalPoints: true,
          submittedAt: true,
          exam: {
            select: {
              title: true,
              showResultsImmediately: true,
              subject: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.gradeEntry.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          points: true,
          maxPoints: true,
          note: true,
          createdAt: true,
          subject: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const bySubject = new Map<
      string,
      { subjectId: string; subjectName: string; items: GradeItem[] }
    >();

    const bucket = (id: string, name: string) => {
      if (!bySubject.has(id)) {
        bySubject.set(id, { subjectId: id, subjectName: name, items: [] });
      }
      return bySubject.get(id)!;
    };

    for (const a of attempts) {
      // Respect the admin's choice to withhold results.
      if (!a.exam.showResultsImmediately) continue;
      bucket(a.exam.subject.id, a.exam.subject.name).items.push({
        id: a.id,
        source: 'exam',
        title: a.exam.title,
        points: a.earnedPoints ?? 0,
        maxPoints: a.totalPoints ?? 0,
        percent: a.score ?? 0,
        note: null,
        date: a.submittedAt!,
      });
    }

    for (const g of manual) {
      bucket(g.subject.id, g.subject.name).items.push({
        id: g.id,
        source: 'manual',
        title: g.title,
        points: g.points,
        maxPoints: g.maxPoints,
        percent: g.maxPoints > 0 ? (g.points / g.maxPoints) * 100 : 0,
        note: g.note,
        date: g.createdAt,
      });
    }

    const subjects = [...bySubject.values()].map((s) => {
      const totalPoints = s.items.reduce((sum, i) => sum + i.points, 0);
      const totalMax = s.items.reduce((sum, i) => sum + i.maxPoints, 0);
      return {
        ...s,
        items: s.items.sort((a, b) => b.date.getTime() - a.date.getTime()),
        totalPoints,
        totalMax,
        average: totalMax > 0 ? (totalPoints / totalMax) * 100 : 0,
      };
    });

    const grandMax = subjects.reduce((sum, s) => sum + s.totalMax, 0);
    const grandPoints = subjects.reduce((sum, s) => sum + s.totalPoints, 0);

    return {
      subjects: subjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'ar')),
      overallAverage: grandMax > 0 ? (grandPoints / grandMax) * 100 : 0,
    };
  }

  /** Gradebook: every student against every exam in one subject. */
  async gradebook(subjectId: string) {
    const [subject, exams, students] = await Promise.all([
      this.prisma.subject.findUnique({
        where: { id: subjectId },
        select: { id: true, name: true },
      }),
      this.prisma.exam.findMany({
        where: { subjectId },
        select: { id: true, title: true, passMark: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { role: 'student' },
        select: { id: true, fullName: true, username: true, avatarUrl: true },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    if (!subject) throw new NotFoundException('المادة غير موجودة');

    const examIds = exams.map((e) => e.id);
    const [attempts, manual] = await Promise.all([
      examIds.length
        ? this.prisma.examAttempt.findMany({
            where: { examId: { in: examIds }, submittedAt: { not: null } },
            select: {
              examId: true,
              userId: true,
              score: true,
              needsReview: true,
            },
          })
        : Promise.resolve([]),
      this.prisma.gradeEntry.findMany({
        where: { subjectId },
        select: {
          id: true,
          userId: true,
          title: true,
          points: true,
          maxPoints: true,
          note: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Best submitted score per student per exam.
    const best = new Map<string, { score: number | null; needsReview: boolean }>();
    for (const a of attempts) {
      const key = `${a.userId}:${a.examId}`;
      const current = best.get(key);
      if (
        !current ||
        (a.score !== null && (current.score === null || a.score > current.score))
      ) {
        best.set(key, { score: a.score, needsReview: a.needsReview });
      }
    }

    const manualByUser = new Map<string, typeof manual>();
    for (const g of manual) {
      const list = manualByUser.get(g.userId) ?? [];
      list.push(g);
      manualByUser.set(g.userId, list);
    }

    const rows = students.map((student) => {
      const examScores = exams.map((exam) => {
        const entry = best.get(`${student.id}:${exam.id}`);
        return {
          examId: exam.id,
          score: entry?.score ?? null,
          needsReview: entry?.needsReview ?? false,
          passed:
            entry?.score !== null && entry?.score !== undefined
              ? entry.score >= exam.passMark
              : null,
        };
      });

      const manualEntries = manualByUser.get(student.id) ?? [];
      const points =
        examScores.reduce((sum, s) => sum + (s.score ?? 0), 0) +
        manualEntries.reduce(
          (sum, g) => sum + (g.maxPoints > 0 ? (g.points / g.maxPoints) * 100 : 0),
          0,
        );
      const count =
        examScores.filter((s) => s.score !== null).length + manualEntries.length;

      return {
        student,
        examScores,
        manual: manualEntries,
        average: count > 0 ? points / count : null,
      };
    });

    return { subject, exams, rows };
  }

  async createManual(dto: CreateGradeDto, actorId?: string) {
    if (dto.points > dto.maxPoints) {
      throw new BadRequestException('الدرجة أكبر من الدرجة القصوى');
    }

    const student = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, role: true, fullName: true },
    });
    if (!student || student.role !== 'student') {
      throw new NotFoundException('الطالب غير موجود');
    }

    const grade = await this.prisma.gradeEntry.create({
      data: {
        userId: dto.userId,
        subjectId: dto.subjectId,
        title: dto.title.trim(),
        points: dto.points,
        maxPoints: dto.maxPoints,
        note: dto.note,
        createdById: actorId,
      },
    });

    this.audit.record(actorId ?? null, 'grade.create', 'grade', grade.id, {
      student: student.fullName,
      title: grade.title,
    });

    return grade;
  }

  async removeManual(id: string, actorId?: string) {
    const grade = await this.prisma.gradeEntry.findUnique({ where: { id } });
    if (!grade) throw new NotFoundException('الدرجة غير موجودة');
    await this.prisma.gradeEntry.delete({ where: { id } });
    this.audit.record(actorId ?? null, 'grade.delete', 'grade', id, {
      title: grade.title,
    });
  }
}
