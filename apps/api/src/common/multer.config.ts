import { memoryStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const memoryUploadOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
};
