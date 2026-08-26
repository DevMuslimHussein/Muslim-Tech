import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const NOTE_COLORS = [
  'default',
  'amber',
  'green',
  'blue',
  'purple',
  'rose',
] as const;

export class CreateNoteDto {
  @IsString()
  @MinLength(1, { message: 'العنوان مطلوب' })
  @MaxLength(120, { message: 'العنوان طويل جدًا' })
  title!: string;

  @IsString()
  @MaxLength(20000, { message: 'المحتوى طويل جدًا' })
  content!: string;

  @IsOptional()
  @IsString()
  lectureId?: string;

  @IsOptional()
  @IsIn(NOTE_COLORS, { message: 'لون غير معروف' })
  color?: (typeof NOTE_COLORS)[number];

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
