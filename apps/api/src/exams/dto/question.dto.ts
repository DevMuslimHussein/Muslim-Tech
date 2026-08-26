import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const QUESTION_TYPES = [
  'multiple_choice',
  'true_false',
  'short_answer',
] as const;

export type QuestionTypeValue = (typeof QUESTION_TYPES)[number];

export class ChoiceDto {
  @IsString()
  @MinLength(1, { message: 'نص الخيار مطلوب' })
  @MaxLength(500)
  text!: string;

  @IsBoolean()
  isCorrect!: boolean;
}

export class CreateQuestionDto {
  @IsIn(QUESTION_TYPES, { message: 'نوع سؤال غير معروف' })
  type!: QuestionTypeValue;

  @IsString()
  @MinLength(1, { message: 'نص السؤال مطلوب' })
  @MaxLength(2000)
  text!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  points?: number;

  /** Required for multiple_choice; ignored for the other types. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2, { message: 'السؤال يحتاج خيارين على الأقل' })
  @ArrayMaxSize(10, { message: 'حد أقصى ١٠ خيارات' })
  @ValidateNested({ each: true })
  @Type(() => ChoiceDto)
  choices?: ChoiceDto[];

  /** Required for true_false. */
  @IsOptional()
  @IsBoolean()
  correctBoolean?: boolean;

  /** Required for short_answer. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  correctText?: string;
}

export class UpdateQuestionDto extends CreateQuestionDto {}

export class ReorderQuestionsDto {
  @IsArray()
  @IsString({ each: true })
  questionIds!: string[];
}
