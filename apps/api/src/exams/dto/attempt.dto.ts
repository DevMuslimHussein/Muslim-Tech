import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  questionId!: string;

  /** For multiple_choice and true_false. */
  @IsOptional()
  @IsString()
  choiceId?: string;

  /** For short_answer. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string;
}

export class SubmitAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers!: SubmitAnswerDto[];
}

/** Admin marking one short answer during review. */
export class GradeAnswerDto {
  @IsString()
  answerId!: string;

  @IsBoolean()
  isCorrect!: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  earnedPoints?: number;
}

export class GradeAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeAnswerDto)
  grades!: GradeAnswerDto[];
}
