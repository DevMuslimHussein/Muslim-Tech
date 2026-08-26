import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { AdminChatController } from './admin-chat.controller';
import { ChatService } from './chat.service';

@Module({
  controllers: [ChatController, AdminChatController],
  providers: [ChatService],
})
export class ChatModule {}
