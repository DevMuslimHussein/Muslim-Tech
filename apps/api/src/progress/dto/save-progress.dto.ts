import { IsInt, Min } from 'class-validator';

export class SaveProgressDto {
  @IsInt()
  @Min(0)
  progressSeconds!: number;

  @IsInt()
  @Min(0)
  durationSeconds!: number;
}
