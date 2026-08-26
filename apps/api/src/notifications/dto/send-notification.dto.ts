import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NotificationAudience, NotificationType } from '@muslim-tech/types';

export class SendNotificationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  body!: string;

  @IsIn(Object.values(NotificationType))
  type!: NotificationType;

  @IsIn(Object.values(NotificationAudience))
  audience!: NotificationAudience;

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsString()
  deepLink?: string;
}
