import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@muslim-tech/types';
import { GradesService } from './grades.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class GradesController {
  constructor(private readonly grades: GradesService) {}

  @Get()
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.grades.forStudent(user.id);
  }
}
