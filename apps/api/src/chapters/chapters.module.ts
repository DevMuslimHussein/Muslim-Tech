import { Module } from '@nestjs/common';
import { ChaptersService } from './chapters.service';
import { AdminChaptersController } from './admin-chapters.controller';

@Module({
  controllers: [AdminChaptersController],
  providers: [ChaptersService],
})
export class ChaptersModule {}
