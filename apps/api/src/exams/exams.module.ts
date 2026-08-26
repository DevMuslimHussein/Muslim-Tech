import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExamsController } from './exams.controller';
import { AdminExamsController } from './admin-exams.controller';
import { ExamsService } from './exams.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ExamsController, AdminExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}
