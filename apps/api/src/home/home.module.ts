import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { LecturesModule } from '../lectures/lectures.module';
import { AnnouncementsModule } from '../announcements/announcements.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { ProgressModule } from '../progress/progress.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    LecturesModule,
    AnnouncementsModule,
    SubjectsModule,
    ProgressModule,
    NotificationsModule,
  ],
  controllers: [HomeController],
})
export class HomeModule {}
