import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@muslim-tech/types';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list() {
    return this.notifications.listForAdmin();
  }

  @Post('send')
  send(
    @Body() dto: SendNotificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notifications.create({ ...dto, createdById: user.id });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notifications.remove(id);
  }
}
