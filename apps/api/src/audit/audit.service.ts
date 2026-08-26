import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fire-and-forget: an audit write must never fail the action it records.
   */
  record(
    actorId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    void this.prisma.auditLog
      .create({ data: { actorId, action, entityType, entityId, metadata } })
      .catch((error: unknown) =>
        this.logger.warn(`Audit write failed: ${String(error)}`),
      );
  }

  async list(page: number, pageSize: number) {
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { fullName: true, username: true } } },
      }),
      this.prisma.auditLog.count(),
    ]);

    return { items, total, page, pageSize };
  }
}
