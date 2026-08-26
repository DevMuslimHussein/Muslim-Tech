import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@muslim-tech/types';
import { StatsService } from './stats.service';
import { AuditService } from '../audit/audit.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminStatsController {
  constructor(
    private readonly stats: StatsService,
    private readonly audit: AuditService,
  ) {}

  @Get('stats')
  async stats_() {
    const [overview, signups, publishes, bySubject, recentStudents] =
      await Promise.all([
        this.stats.overview(),
        this.stats.signupsSeries(),
        this.stats.publishesSeries(),
        this.stats.lecturesBySubject(),
        this.stats.recentStudents(),
      ]);

    return { overview, signups, publishes, bySubject, recentStudents };
  }

  @Get('audit')
  audit_(@Query('page') page = '1', @Query('pageSize') pageSize = '30') {
    return this.audit.list(Number(page) || 1, Number(pageSize) || 30);
  }
}
