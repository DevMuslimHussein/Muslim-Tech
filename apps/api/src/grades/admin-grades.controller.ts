import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@muslim-tech/types';
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@Controller('admin/grades')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminGradesController {
  constructor(private readonly grades: GradesService) {}

  @Get()
  gradebook(@Query('subjectId') subjectId: string) {
    return this.grades.gradebook(subjectId);
  }

  @Get('student/:userId')
  forStudent(@Param('userId') userId: string) {
    return this.grades.forStudent(userId);
  }

  @Post()
  create(@Body() dto: CreateGradeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.grades.createManual(dto, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.grades.removeManual(id, user.id);
  }
}
