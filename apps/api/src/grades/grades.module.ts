import { Module } from '@nestjs/common';
import { GradesController } from './grades.controller';
import { AdminGradesController } from './admin-grades.controller';
import { GradesService } from './grades.service';

@Module({
  controllers: [GradesController, AdminGradesController],
  providers: [GradesService],
})
export class GradesModule {}
