import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateChapterDto } from './dto/create-chapter.dto';
import type { UpdateChapterDto } from './dto/update-chapter.dto';

@Injectable()
export class ChaptersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateChapterDto) {
    return this.prisma.chapter.create({ data: dto });
  }

  async findByIdForAdmin(id: string) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id } });
    if (!chapter) {
      throw new NotFoundException('الفصل غير موجود');
    }
    return chapter;
  }

  async update(id: string, dto: UpdateChapterDto) {
    await this.findByIdForAdmin(id);
    return this.prisma.chapter.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findByIdForAdmin(id);
    await this.prisma.chapter.delete({ where: { id } });
  }
}
