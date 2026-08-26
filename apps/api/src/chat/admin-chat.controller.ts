import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@muslim-tech/types';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@Controller('admin/chat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  list(@Query('search') search?: string) {
    return this.chat.listConversations(search);
  }

  @Get('unread')
  unread() {
    return this.chat.adminUnreadTotal();
  }

  @Post('with/:studentId')
  openWithStudent(@Param('studentId') studentId: string) {
    return this.chat.openThreadWithStudent(studentId);
  }

  @Get(':id')
  thread(@Param('id') id: string, @Query('since') since?: string) {
    return this.chat.adminThread(id, since);
  }

  @Post(':id')
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.sendAsAdmin(user.id, id, dto.body);
  }
}
