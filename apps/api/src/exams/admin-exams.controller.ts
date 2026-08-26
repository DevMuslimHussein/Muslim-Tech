import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@muslim-tech/types';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { CreateQuestionDto } from './dto/question.dto';
import { GradeAttemptDto } from './dto/attempt.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@Controller('admin/exams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get()
  list(@Query('subjectId') subjectId?: string) {
    return this.exams.listForAdmin(subjectId);
  }

  @Post()
  create(@Body() dto: CreateExamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.exams.create(dto, user.id);
  }

  @Get('attempts/:attemptId')
  attemptDetail(@Param('attemptId') attemptId: string) {
    return this.exams.attemptDetailForAdmin(attemptId);
  }

  @Patch('attempts/:attemptId/grade')
  gradeAttempt(
    @Param('attemptId') attemptId: string,
    @Body() dto: GradeAttemptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exams.gradeAttempt(attemptId, dto, user.id);
  }

  @Delete('questions/:questionId')
  @HttpCode(204)
  removeQuestion(@Param('questionId') questionId: string) {
    return this.exams.removeQuestion(questionId);
  }

  @Patch('questions/:questionId')
  updateQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.exams.updateQuestion(questionId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.exams.findForAdmin(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exams.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exams.remove(id, user.id);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exams.publish(id, user.id);
  }

  @Post(':id/unpublish')
  unpublish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.exams.unpublish(id, user.id);
  }

  @Post(':id/questions')
  addQuestion(@Param('id') id: string, @Body() dto: CreateQuestionDto) {
    return this.exams.addQuestion(id, dto);
  }

  @Get(':id/attempts')
  attempts(@Param('id') id: string) {
    return this.exams.listAttempts(id);
  }
}
