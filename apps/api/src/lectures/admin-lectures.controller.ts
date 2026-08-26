import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { StorageService } from '../storage/storage.service';
import { memoryUploadOptions } from '../common/multer.config';
import { fixFilenameEncoding } from '../common/fix-filename-encoding';
import { LecturesService } from './lectures.service';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { UpdateLectureDto } from './dto/update-lecture.dto';

@Controller('admin/lectures')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminLecturesController {
  constructor(
    private readonly lectures: LecturesService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  list(@Query('chapterId') chapterId?: string) {
    return this.lectures.listForAdmin(chapterId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lectures.findByIdForAdmin(id);
  }

  @Post()
  create(@Body() dto: CreateLectureDto) {
    return this.lectures.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLectureDto) {
    return this.lectures.update(id, dto);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.lectures.publish(id, user.id);
  }

  @Post(':id/thumbnail')
  @UseInterceptors(FileInterceptor('file', memoryUploadOptions))
  async uploadThumbnail(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { url } = await this.storage.savePublic(
      file.buffer,
      fixFilenameEncoding(file.originalname),
    );
    return this.lectures.setThumbnail(id, url);
  }

  @Post(':id/video')
  @UseInterceptors(FileInterceptor('file', memoryUploadOptions))
  async uploadVideo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { storedPath } = await this.storage.saveProtected(
      file.buffer,
      fixFilenameEncoding(file.originalname),
    );
    return this.lectures.setVideo(id, storedPath);
  }

  @Post(':id/files')
  @UseInterceptors(FileInterceptor('file', memoryUploadOptions))
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('isDownloadable') isDownloadable?: string,
  ) {
    const fileName = fixFilenameEncoding(file.originalname);
    const { storedPath, size } = await this.storage.saveProtected(
      file.buffer,
      fileName,
    );
    return this.lectures.addFile(
      id,
      {
        fileName,
        storedPath,
        fileType: file.mimetype,
        fileSize: size,
      },
      isDownloadable !== 'false',
    );
  }

  @Delete('files/:fileId')
  removeFile(@Param('fileId') fileId: string) {
    return this.lectures.removeFile(fileId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.lectures.remove(id);
  }
}
