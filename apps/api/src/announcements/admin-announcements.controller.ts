import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@muslim-tech/types';
import { StorageService } from '../storage/storage.service';
import { memoryUploadOptions } from '../common/multer.config';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@Controller('admin/announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAnnouncementsController {
  constructor(
    private readonly announcements: AnnouncementsService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  list() {
    return this.announcements.listForAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.announcements.findByIdForAdmin(id);
  }

  @Post()
  create(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.announcements.create(dto, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.announcements.update(id, dto);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file', memoryUploadOptions))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { url } = await this.storage.savePublic(
      file.buffer,
      file.originalname,
    );
    return this.announcements.setImage(id, url);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.announcements.remove(id);
  }
}
