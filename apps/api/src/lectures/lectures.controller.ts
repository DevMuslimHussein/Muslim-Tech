import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';
import { LecturesService } from './lectures.service';

const STORAGE_ROOT = join(process.cwd(), 'storage');

@Controller('lectures')
@UseGuards(JwtAuthGuard)
export class LecturesController {
  constructor(
    private readonly lectures: LecturesService,
    private readonly storage: StorageService,
  ) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lectures.findPublishedById(id);
  }

  @Get(':id/video')
  async streamVideo(
    @Param('id') id: string,
    @Headers('range') range: string | undefined,
    @Res() res: Response,
  ) {
    const storedPath = await this.lectures.getVideoStoredPath(id);
    const fullPath = join(STORAGE_ROOT, storedPath);

    let size: number;
    try {
      size = statSync(fullPath).size;
    } catch {
      throw new NotFoundException('ملف الفيديو غير موجود');
    }

    const contentType = guessVideoContentType(fullPath);

    if (!range) {
      res.writeHead(200, {
        'Content-Length': size,
        'Content-Type': contentType,
      });
      this.storage.getProtectedStream(storedPath)?.pipe(res);
      return;
    }

    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? parseInt(match[1], 10) : 0;
    const end = match?.[2] ? parseInt(match[2], 10) : size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });

    const { createReadStream } = await import('node:fs');
    createReadStream(fullPath, { start, end }).pipe(res);
  }
}

function guessVideoContentType(path: string): string {
  if (path.endsWith('.webm')) return 'video/webm';
  if (path.endsWith('.ogg')) return 'video/ogg';
  return 'video/mp4';
}
