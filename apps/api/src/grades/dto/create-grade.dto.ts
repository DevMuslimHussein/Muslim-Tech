import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGradeDto {
  @IsString()
  userId!: string;

  @IsString()
  subjectId!: string;

  @IsString()
  @MinLength(1, { message: 'العنوان مطلوب' })
  @MaxLength(120)
  title!: string;

  @IsNumber()
  @Min(0, { message: 'الدرجة لا تكون سالبة' })
  points!: number;

  @IsNumber()
  @Min(1, { message: 'الدرجة القصوى لا تقل عن ١' })
  maxPoints!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
