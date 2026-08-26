import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('lectureId') lectureId?: string,
    @Query('search') search?: string,
  ) {
    return this.notes.list(user.id, lectureId, search);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateNoteDto) {
    return this.notes.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notes.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notes.remove(user.id, id);
  }
}
