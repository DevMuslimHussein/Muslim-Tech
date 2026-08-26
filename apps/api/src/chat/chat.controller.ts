import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@muslim-tech/types';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

/**
 * Students only: an admin hitting these would silently open a "student"
 * conversation against their own account and clutter the inbox.
 */
@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  thread(
    @CurrentUser() user: AuthenticatedUser,
    @Query('since') since?: string,
  ) {
    return this.chat.studentThread(user.id, since);
  }

  @Get('unread')
  unread(@CurrentUser() user: AuthenticatedUser) {
    return this.chat.studentUnreadCount(user.id);
  }

  @Post()
  send(@CurrentUser() user: AuthenticatedUser, @Body() dto: SendMessageDto) {
    return this.chat.sendAsStudent(user.id, dto.body);
  }
}
