import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@muslim-tech/types';
import { ExamsService } from './exams.service';
import { SubmitAttemptDto } from './dto/attempt.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.exams.listForStudent(user.id);
  }

  @Post(':id/start')
  start(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.exams.startAttempt(user.id, id);
  }

  @Post('attempts/:attemptId/submit')
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attemptId') attemptId: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.exams.submitAttempt(user.id, attemptId, dto);
  }

  @Get('attempts/:attemptId/result')
  result(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attemptId') attemptId: string,
  ) {
    return this.exams.attemptResult(user.id, attemptId);
  }
}
