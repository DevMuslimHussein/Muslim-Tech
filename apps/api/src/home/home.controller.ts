import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LecturesService } from '../lectures/lectures.service';
import { AnnouncementsService } from '../announcements/announcements.service';
import { SubjectsService } from '../subjects/subjects.service';
import { ProgressService } from '../progress/progress.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@Controller('home')
@UseGuards(JwtAuthGuard)
export class HomeController {
  constructor(
    private readonly lectures: LecturesService,
    private readonly announcements: AnnouncementsService,
    private readonly subjects: SubjectsService,
    private readonly progress: ProgressService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  async summary(@CurrentUser() user: AuthenticatedUser) {
    const [
      latestLectures,
      activeAnnouncements,
      subjects,
      subjectProgress,
      continueWatching,
      unread,
    ] = await Promise.all([
      this.lectures.listRecentPublished(6),
      this.announcements.listActive(),
      this.subjects.listPublished(),
      this.progress.subjectProgress(user.id),
      this.progress.continueWatching(user.id),
      this.notifications.unreadCount(user.id),
    ]);

    return {
      latestLectures,
      announcements: activeAnnouncements,
      subjects: subjects.map((subject) => ({
        ...subject,
        progress: subjectProgress[subject.id] ?? {
          total: 0,
          completed: 0,
          percent: 0,
        },
      })),
      continueWatching,
      unreadNotifications: unread.count,
    };
  }
}
