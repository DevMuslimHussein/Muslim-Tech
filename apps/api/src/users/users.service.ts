import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { UpdateStudentDto } from './dto/update-student.dto';

const STUDENT_LIST_SELECT = {
  id: true,
  fullName: true,
  username: true,
  email: true,
  phone: true,
  avatarUrl: true,
  status: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findByIdentifier(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  touchLastLogin(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async listStudents(
    search: string | undefined,
    page: number,
    pageSize: number,
  ) {
    const where = {
      role: 'student' as const,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' as const } },
              { username: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: STUDENT_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findStudentById(id: string) {
    const student = await this.prisma.user.findFirst({
      where: { id, role: 'student' },
      select: STUDENT_LIST_SELECT,
    });
    if (!student) {
      throw new NotFoundException('الطالب غير موجود');
    }
    return student;
  }

  async updateStudent(id: string, dto: UpdateStudentDto, actorId?: string) {
    const before = await this.findStudentById(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: STUDENT_LIST_SELECT,
    });

    if (dto.status && dto.status !== before.status) {
      const action =
        dto.status === 'suspended' ? 'student.suspend' : 'student.activate';
      this.audit.record(actorId ?? null, action, 'user', id, {
        fullName: updated.fullName,
      });
    }

    return updated;
  }

  async removeStudent(id: string, actorId?: string) {
    const student = await this.findStudentById(id);
    await this.prisma.user.delete({ where: { id } });
    this.audit.record(actorId ?? null, 'student.delete', 'user', id, {
      fullName: student.fullName,
    });
  }
}
