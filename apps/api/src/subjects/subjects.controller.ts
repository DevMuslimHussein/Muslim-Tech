import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubjectsService } from './subjects.service';

@Controller('subjects')
@UseGuards(JwtAuthGuard)
export class SubjectsController {
  constructor(private readonly subjects: SubjectsService) {}

  @Get()
  list() {
    return this.subjects.listPublished();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subjects.findPublishedById(id);
  }

  @Get(':id/chapters')
  chapters(@Param('id') id: string, @Query('all') all?: string) {
    return this.subjects.chaptersWithLectures(id, all !== 'true');
  }
}
