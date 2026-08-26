import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  body!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  linkUrl?: string;

  @IsOptional()
  @IsISO8601()
  publishAt?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
