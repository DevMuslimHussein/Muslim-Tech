import { Module } from '@nestjs/common';
import { LecturesService } from './lectures.service';
import { LecturesController } from './lectures.controller';
import { AdminLecturesController } from './admin-lectures.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [LecturesController, AdminLecturesController],
  providers: [LecturesService],
  exports: [LecturesService],
})
export class LecturesModule {}
