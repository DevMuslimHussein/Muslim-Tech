import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@muslim-tech/types';
import { ChaptersService } from './chapters.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

@Controller('admin/chapters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminChaptersController {
  constructor(private readonly chapters: ChaptersService) {}

  @Post()
  create(@Body() dto: CreateChapterDto) {
    return this.chapters.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateChapterDto) {
    return this.chapters.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.chapters.remove(id);
  }
}
