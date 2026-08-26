import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@muslim-tech/types';
import { UsersService } from './users.service';
import { UpdateStudentDto } from './dto/update-student.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@Controller('admin/students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminStudentsController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.users.listStudents(
      search,
      Number(page) || 1,
      Number(pageSize) || 20,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findStudentById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.users.updateStudent(id, dto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.users.removeStudent(id, user.id);
  }
}
