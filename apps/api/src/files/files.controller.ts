import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Get(':id')
  async download(@Param('id') id: string, @Res() res: Response) {
    const file = await this.prisma.lectureFile.findUnique({ where: { id } });
    if (!file) {
      throw new NotFoundException('الملف غير موجود');
    }

    const stream = this.storage.getProtectedStream(file.fileUrl);
    if (!stream) {
      throw new NotFoundException('الملف غير موجود');
    }

    res.setHeader('Content-Type', file.fileType);
    res.setHeader(
      'Content-Disposition',
      `${file.isDownloadable ? 'attachment' : 'inline'}; filename="${encodeURIComponent(file.fileName)}"`,
    );
    stream.pipe(res);
  }
}
