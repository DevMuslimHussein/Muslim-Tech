import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { LectureStatus } from '@muslim-tech/types';

export class CreateLectureDto {
  @IsString()
  chapterId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsInt()
  number!: number;

  @IsOptional()
  @IsIn(Object.values(LectureStatus))
  status?: LectureStatus;

  @IsOptional()
  @IsISO8601()
  publishAt?: string;

  /** A YouTube URL in any shape, or a bare video id. Empty string clears it. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  youtubeUrl?: string;
}
