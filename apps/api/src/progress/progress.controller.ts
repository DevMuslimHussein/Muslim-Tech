import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProgressService } from './progress.service';
import { SaveProgressDto } from './dto/save-progress.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Patch('lectures/:id/progress')
  saveProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') lectureId: string,
    @Body() dto: SaveProgressDto,
  ) {
    return this.progress.saveProgress(
      user.id,
      lectureId,
      dto.progressSeconds,
      dto.durationSeconds,
    );
  }

  @Get('lectures/:id/progress')
  getProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') lectureId: string,
  ) {
    return this.progress.getProgress(user.id, lectureId);
  }

  @Get('progress/subjects')
  subjectProgress(@CurrentUser() user: AuthenticatedUser) {
    return this.progress.subjectProgress(user.id);
  }

  @Get('progress/continue')
  continueWatching(@CurrentUser() user: AuthenticatedUser) {
    return this.progress.continueWatching(user.id);
  }

  @Get('bookmarks')
  listBookmarks(@CurrentUser() user: AuthenticatedUser) {
    return this.progress.listBookmarks(user.id);
  }

  @Get('lectures/:id/bookmark')
  isBookmarked(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') lectureId: string,
  ) {
    return this.progress.isBookmarked(user.id, lectureId);
  }

  @Post('lectures/:id/bookmark')
  toggleBookmark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') lectureId: string,
  ) {
    return this.progress.toggleBookmark(user.id, lectureId);
  }
}
