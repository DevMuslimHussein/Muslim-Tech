import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateExamDto } from './dto/create-exam.dto';
import type { UpdateExamDto } from './dto/update-exam.dto';
import type { CreateQuestionDto } from './dto/question.dto';
import type { GradeAttemptDto, SubmitAttemptDto } from './dto/attempt.dto';

/**
 * Everything a student is allowed to see about a question. Deliberately omits
 * `isCorrect` on choices and `correctText` — a student must never receive the
 * answer key, not even in a field the UI happens not to render.
 */
const STUDENT_QUESTION_SELECT = {
  id: true,
  type: true,
  text: true,
  points: true,
  order: true,
  choices: {
    select: { id: true, text: true, order: true },
    orderBy: { order: 'asc' as const },
  },
} as const;

const ADMIN_QUESTION_SELECT = {
  id: true,
  type: true,
  text: true,
  points: true,
  order: true,
  correctText: true,
  choices: {
    select: { id: true, text: true, isCorrect: true, order: true },
    orderBy: { order: 'asc' as const },
  },
} as const;

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ------------------------------------------------------------ admin: exams

  listForAdmin(subjectId?: string) {
    return this.prisma.exam.findMany({
      where: subjectId ? { subjectId } : undefined,
      include: {
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, title: true } },
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findForAdmin(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, title: true } },
        questions: {
          select: ADMIN_QUESTION_SELECT,
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!exam) throw new NotFoundException('الامتحان غير موجود');
    return exam;
  }

  async create(dto: CreateExamDto, actorId?: string) {
    const exam = await this.prisma.exam.create({
      data: {
        subjectId: dto.subjectId,
        chapterId: dto.chapterId || null,
        title: dto.title.trim(),
        description: dto.description,
        durationMinutes: dto.durationMinutes ?? null,
        passMark: dto.passMark ?? 50,
        maxAttempts: dto.maxAttempts ?? 1,
        shuffleQuestions: dto.shuffleQuestions ?? true,
        showResultsImmediately: dto.showResultsImmediately ?? true,
        opensAt: dto.opensAt ? new Date(dto.opensAt) : null,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
        createdById: actorId,
      },
    });
    this.audit.record(actorId ?? null, 'exam.create', 'exam', exam.id, {
      title: exam.title,
    });
    return exam;
  }

  async update(id: string, dto: UpdateExamDto, actorId?: string) {
    await this.findForAdmin(id);
    const exam = await this.prisma.exam.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.chapterId !== undefined
          ? { chapterId: dto.chapterId || null }
          : {}),
        ...(dto.durationMinutes !== undefined
          ? { durationMinutes: dto.durationMinutes }
          : {}),
        ...(dto.passMark !== undefined ? { passMark: dto.passMark } : {}),
        ...(dto.maxAttempts !== undefined
          ? { maxAttempts: dto.maxAttempts }
          : {}),
        ...(dto.shuffleQuestions !== undefined
          ? { shuffleQuestions: dto.shuffleQuestions }
          : {}),
        ...(dto.showResultsImmediately !== undefined
          ? { showResultsImmediately: dto.showResultsImmediately }
          : {}),
        ...(dto.opensAt !== undefined
          ? { opensAt: dto.opensAt ? new Date(dto.opensAt) : null }
          : {}),
        ...(dto.closesAt !== undefined
          ? { closesAt: dto.closesAt ? new Date(dto.closesAt) : null }
          : {}),
      },
    });
    this.audit.record(actorId ?? null, 'exam.update', 'exam', id, {
      title: exam.title,
    });
    return exam;
  }

  async publish(id: string, actorId?: string) {
    const exam = await this.findForAdmin(id);
    if (exam.questions.length === 0) {
      throw new BadRequestException('لا يمكن نشر امتحان بلا أسئلة');
    }

    const published = await this.prisma.exam.update({
      where: { id },
      data: { status: 'published' },
      include: { subject: { select: { name: true } } },
    });

    this.audit.record(actorId ?? null, 'exam.publish', 'exam', id, {
      title: published.title,
    });
    this.notifications.create({
      title: 'امتحان جديد',
      body: `${published.title} — ${published.subject.name}`,
      type: 'system',
      audience: 'all',
      deepLink: `/exams/${id}`,
      createdById: actorId,
    });

    return published;
  }

  async unpublish(id: string, actorId?: string) {
    await this.findForAdmin(id);
    const exam = await this.prisma.exam.update({
      where: { id },
      data: { status: 'draft' },
    });
    this.audit.record(actorId ?? null, 'exam.unpublish', 'exam', id, {
      title: exam.title,
    });
    return exam;
  }

  async remove(id: string, actorId?: string) {
    const exam = await this.findForAdmin(id);
    await this.prisma.exam.delete({ where: { id } });
    this.audit.record(actorId ?? null, 'exam.delete', 'exam', id, {
      title: exam.title,
    });
  }

  // -------------------------------------------------------- admin: questions

  async addQuestion(examId: string, dto: CreateQuestionDto) {
    await this.findForAdmin(examId);
    const last = await this.prisma.question.findFirst({
      where: { examId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const { choices, correctText } = this.buildAnswerKey(dto);

    return this.prisma.question.create({
      data: {
        examId,
        type: dto.type,
        text: dto.text.trim(),
        points: dto.points ?? 1,
        order: (last?.order ?? -1) + 1,
        correctText,
        choices: choices ? { create: choices } : undefined,
      },
      select: ADMIN_QUESTION_SELECT,
    });
  }

  async updateQuestion(questionId: string, dto: CreateQuestionDto) {
    const existing = await this.prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('السؤال غير موجود');

    const { choices, correctText } = this.buildAnswerKey(dto);

    // Choices are replaced wholesale: editing a question's options in place
    // would leave already-submitted answers pointing at stale rows.
    await this.prisma.choice.deleteMany({ where: { questionId } });

    return this.prisma.question.update({
      where: { id: questionId },
      data: {
        type: dto.type,
        text: dto.text.trim(),
        points: dto.points ?? 1,
        correctText,
        choices: choices ? { create: choices } : undefined,
      },
      select: ADMIN_QUESTION_SELECT,
    });
  }

  async removeQuestion(questionId: string) {
    const existing = await this.prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('السؤال غير موجود');
    await this.prisma.question.delete({ where: { id: questionId } });
  }

  /** Normalises the three question shapes into rows the schema can store. */
  private buildAnswerKey(dto: CreateQuestionDto): {
    choices: { text: string; isCorrect: boolean; order: number }[] | null;
    correctText: string | null;
  } {
    if (dto.type === 'multiple_choice') {
      if (!dto.choices || dto.choices.length < 2) {
        throw new BadRequestException('السؤال يحتاج خيارين على الأقل');
      }
      if (!dto.choices.some((c) => c.isCorrect)) {
        throw new BadRequestException('حدّد الإجابة الصحيحة');
      }
      return {
        choices: dto.choices.map((c, index) => ({
          text: c.text.trim(),
          isCorrect: c.isCorrect,
          order: index,
        })),
        correctText: null,
      };
    }

    if (dto.type === 'true_false') {
      if (dto.correctBoolean === undefined) {
        throw new BadRequestException('حدّد إن كانت العبارة صحيحة أم خاطئة');
      }
      return {
        choices: [
          { text: 'صح', isCorrect: dto.correctBoolean, order: 0 },
          { text: 'خطأ', isCorrect: !dto.correctBoolean, order: 1 },
        ],
        correctText: null,
      };
    }

    if (!dto.correctText?.trim()) {
      throw new BadRequestException('اكتب الإجابة النموذجية');
    }
    return { choices: null, correctText: dto.correctText.trim() };
  }

  // ---------------------------------------------------------- student: taking

  /** Exams the student may see: published, and inside their open window. */
  async listForStudent(userId: string) {
    const now = new Date();
    const exams = await this.prisma.exam.findMany({
      where: {
        status: 'published',
        AND: [
          { OR: [{ opensAt: null }, { opensAt: { lte: now } }] },
          { subject: { isPublished: true } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        durationMinutes: true,
        passMark: true,
        maxAttempts: true,
        closesAt: true,
        opensAt: true,
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, title: true } },
        _count: { select: { questions: true } },
        attempts: {
          where: { userId },
          select: {
            id: true,
            score: true,
            submittedAt: true,
            needsReview: true,
          },
          orderBy: { startedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return exams.map((exam) => {
      const submitted = exam.attempts.filter((a) => a.submittedAt !== null);
      const inProgress = exam.attempts.find((a) => a.submittedAt === null);
      const best = submitted.reduce<number | null>(
        (acc, a) => (a.score !== null && (acc === null || a.score > acc) ? a.score : acc),
        null,
      );
      const closed = exam.closesAt !== null && exam.closesAt < now;

      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        passMark: exam.passMark,
        maxAttempts: exam.maxAttempts,
        closesAt: exam.closesAt,
        subject: exam.subject,
        chapter: exam.chapter,
        questionCount: exam._count.questions,
        attemptsUsed: submitted.length,
        attemptsLeft: Math.max(0, exam.maxAttempts - submitted.length),
        bestScore: best,
        awaitingReview: submitted.some((a) => a.needsReview),
        inProgressAttemptId: inProgress?.id ?? null,
        closed,
      };
    });
  }

  /**
   * Starts (or resumes) an attempt and returns the questions without any
   * answer-key fields.
   */
  async startAttempt(userId: string, examId: string) {
    const now = new Date();
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          select: STUDENT_QUESTION_SELECT,
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!exam || exam.status !== 'published') {
      throw new NotFoundException('الامتحان غير متاح');
    }
    if (exam.opensAt && exam.opensAt > now) {
      throw new ForbiddenException('لم يبدأ الامتحان بعد');
    }
    if (exam.closesAt && exam.closesAt < now) {
      throw new ForbiddenException('انتهى وقت الامتحان');
    }
    if (exam.questions.length === 0) {
      throw new BadRequestException('لا توجد أسئلة في هذا الامتحان');
    }

    const existing = await this.prisma.examAttempt.findFirst({
      where: { examId, userId, submittedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    const attempt =
      existing ??
      (await (async () => {
        const used = await this.prisma.examAttempt.count({
          where: { examId, userId, submittedAt: { not: null } },
        });
        if (used >= exam.maxAttempts) {
          throw new ForbiddenException('استنفدت عدد المحاولات المسموحة');
        }
        return this.prisma.examAttempt.create({
          data: { examId, userId },
        });
      })());

    const questions = exam.shuffleQuestions
      ? shuffle(exam.questions)
      : exam.questions;

    return {
      attemptId: attempt.id,
      startedAt: attempt.startedAt,
      durationMinutes: exam.durationMinutes,
      title: exam.title,
      passMark: exam.passMark,
      showResultsImmediately: exam.showResultsImmediately,
      questions,
    };
  }

  async submitAttempt(
    userId: string,
    attemptId: string,
    dto: SubmitAttemptDto,
  ) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            questions: {
              select: ADMIN_QUESTION_SELECT,
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('المحاولة غير موجودة');
    }
    if (attempt.submittedAt) {
      throw new BadRequestException('تم تسليم هذه المحاولة مسبقًا');
    }

    // A late submission is still accepted and graded — the client may have
    // auto-submitted a moment after the deadline. Rejecting it would lose the
    // student's work over a rounding error.
    const byQuestion = new Map(dto.answers.map((a) => [a.questionId, a]));
    const rows: {
      questionId: string;
      choiceId: string | null;
      text: string | null;
      isCorrect: boolean | null;
      earnedPoints: number | null;
    }[] = [];

    let earned = 0;
    let total = 0;
    let needsReview = false;

    for (const question of attempt.exam.questions) {
      total += question.points;
      const given = byQuestion.get(question.id);

      if (!given) {
        rows.push({
          questionId: question.id,
          choiceId: null,
          text: null,
          isCorrect: false,
          earnedPoints: 0,
        });
        continue;
      }

      if (question.type === 'short_answer') {
        const expected = question.correctText?.trim().toLowerCase() ?? '';
        const actual = given.text?.trim().toLowerCase() ?? '';
        // Exact match auto-passes; anything else waits for the admin rather
        // than being marked wrong on a wording difference.
        if (expected && actual && expected === actual) {
          earned += question.points;
          rows.push({
            questionId: question.id,
            choiceId: null,
            text: given.text ?? null,
            isCorrect: true,
            earnedPoints: question.points,
          });
        } else {
          needsReview = true;
          rows.push({
            questionId: question.id,
            choiceId: null,
            text: given.text ?? null,
            isCorrect: null,
            earnedPoints: null,
          });
        }
        continue;
      }

      const chosen = question.choices.find((c) => c.id === given.choiceId);
      const correct = chosen?.isCorrect === true;
      if (correct) earned += question.points;
      rows.push({
        questionId: question.id,
        choiceId: chosen?.id ?? null,
        text: null,
        isCorrect: correct,
        earnedPoints: correct ? question.points : 0,
      });
    }

    const score = total > 0 ? (earned / total) * 100 : 0;

    await this.prisma.$transaction([
      this.prisma.answer.deleteMany({ where: { attemptId } }),
      this.prisma.answer.createMany({
        data: rows.map((r) => ({ ...r, attemptId })),
      }),
      this.prisma.examAttempt.update({
        where: { id: attemptId },
        data: {
          submittedAt: new Date(),
          earnedPoints: earned,
          totalPoints: total,
          score,
          needsReview,
        },
      }),
    ]);

    return this.attemptResult(userId, attemptId);
  }

  /** The student's own view of a finished attempt. */
  async attemptResult(userId: string, attemptId: string) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            passMark: true,
            showResultsImmediately: true,
            subject: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('المحاولة غير موجودة');
    }

    const visible = attempt.exam.showResultsImmediately;

    return {
      attemptId: attempt.id,
      examTitle: attempt.exam.title,
      subject: attempt.exam.subject,
      submittedAt: attempt.submittedAt,
      needsReview: attempt.needsReview,
      passMark: attempt.exam.passMark,
      // Withheld when the admin chose to publish results later.
      score: visible ? attempt.score : null,
      earnedPoints: visible ? attempt.earnedPoints : null,
      totalPoints: visible ? attempt.totalPoints : null,
      passed:
        visible && attempt.score !== null
          ? attempt.score >= attempt.exam.passMark
          : null,
      resultsHidden: !visible,
    };
  }

  // -------------------------------------------------------- admin: results

  async listAttempts(examId: string) {
    await this.findForAdmin(examId);
    return this.prisma.examAttempt.findMany({
      where: { examId, submittedAt: { not: null } },
      include: {
        user: {
          select: { id: true, fullName: true, username: true, avatarUrl: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async attemptDetailForAdmin(attemptId: string) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        user: { select: { id: true, fullName: true, username: true } },
        exam: { select: { id: true, title: true, passMark: true } },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                text: true,
                type: true,
                points: true,
                correctText: true,
                choices: { select: { id: true, text: true, isCorrect: true } },
              },
            },
            choice: { select: { id: true, text: true } },
          },
        },
      },
    });
    if (!attempt) throw new NotFoundException('المحاولة غير موجودة');
    return attempt;
  }

  /** Applies the admin's marks to short answers and recomputes the score. */
  async gradeAttempt(attemptId: string, dto: GradeAttemptDto, actorId?: string) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: { include: { question: true } } },
    });
    if (!attempt) throw new NotFoundException('المحاولة غير موجودة');

    const byId = new Map(attempt.answers.map((a) => [a.id, a]));

    await this.prisma.$transaction(
      dto.grades.map((g) => {
        const answer = byId.get(g.answerId);
        const max = answer?.question.points ?? 0;
        const points = g.isCorrect
          ? Math.min(g.earnedPoints ?? max, max)
          : 0;
        return this.prisma.answer.update({
          where: { id: g.answerId },
          data: { isCorrect: g.isCorrect, earnedPoints: points },
        });
      }),
    );

    const fresh = await this.prisma.answer.findMany({
      where: { attemptId },
      select: { earnedPoints: true, isCorrect: true },
    });

    const earned = fresh.reduce((sum, a) => sum + (a.earnedPoints ?? 0), 0);
    const total = attempt.totalPoints ?? 0;
    const stillPending = fresh.some((a) => a.isCorrect === null);

    const updated = await this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        earnedPoints: earned,
        score: total > 0 ? (earned / total) * 100 : 0,
        needsReview: stillPending,
      },
    });

    this.audit.record(actorId ?? null, 'exam.grade', 'attempt', attemptId, {
      score: updated.score,
    });

    return updated;
  }
}

/** Fisher–Yates, so question order differs per student. */
function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
