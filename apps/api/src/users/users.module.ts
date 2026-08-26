import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { AdminStudentsController } from './admin-students.controller';

@Module({
  controllers: [AdminStudentsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
