import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateExamDto {
  @IsString()
  subjectId!: string;

  @IsOptional()
  @IsString()
  chapterId?: string;

  @IsString()
  @MinLength(1, { message: 'العنوان مطلوب' })
  @MaxLength(150)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'المدة لا تقل عن دقيقة' })
  @Max(600)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passMark?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxAttempts?: number;

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  showResultsImmediately?: boolean;

  @IsOptional()
  @IsISO8601()
  opensAt?: string;

  @IsOptional()
  @IsISO8601()
  closesAt?: string;
}
