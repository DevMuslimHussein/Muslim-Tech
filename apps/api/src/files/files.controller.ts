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
  async view(@Param('id') id: string, @Res() res: Response) {
    const file = await this.prisma.lectureFile.findUnique({ where: { id } });
    if (!file) {
      throw new NotFoundException('الملف غير موجود');
    }

    const stream = this.storage.getProtectedStream(file.fileUrl);
    if (!stream) {
      throw new NotFoundException('الملف غير موجود');
    }

    res.setHeader('Content-Type', file.fileType);
    // Always inline: course material is meant to be read inside the app, never
    // handed to the browser as a "Save as" download.
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Keep it out of the shared/disk cache so it can't be recovered from the
    // browser cache after the student's access is revoked.
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    stream.pipe(res);
  }
}
