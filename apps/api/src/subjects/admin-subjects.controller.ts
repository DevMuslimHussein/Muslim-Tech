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
import { UserRole } from '@muslim-tech/types';
import { StorageService } from '../storage/storage.service';
import { memoryUploadOptions } from '../common/multer.config';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Controller('admin/subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSubjectsController {
  constructor(
    private readonly subjects: SubjectsService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  list() {
    return this.subjects.listAllForAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subjects.findByIdForAdmin(id);
  }

  @Post()
  create(@Body() dto: CreateSubjectDto) {
    return this.subjects.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjects.update(id, dto);
  }

  @Post(':id/icon')
  @UseInterceptors(FileInterceptor('file', memoryUploadOptions))
  async uploadIcon(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { url } = await this.storage.savePublic(
      file.buffer,
      file.originalname,
    );
    return this.subjects.setIcon(id, url);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subjects.remove(id);
  }
}
