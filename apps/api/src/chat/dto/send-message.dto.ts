import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1, { message: 'الرسالة فارغة' })
  @MaxLength(4000, { message: 'الرسالة طويلة جدًا' })
  body!: string;
}
