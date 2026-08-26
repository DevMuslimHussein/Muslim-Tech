import { Module } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { AdminSubjectsController } from './admin-subjects.controller';

@Module({
  controllers: [SubjectsController, AdminSubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}
