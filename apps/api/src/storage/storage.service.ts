import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const STORAGE_ROOT = join(process.cwd(), 'storage');
const PUBLIC_DIR = join(STORAGE_ROOT, 'public');
const PROTECTED_DIR = join(STORAGE_ROOT, 'protected');

/**
 * Local-disk file storage. Swap this implementation for Cloudflare R2 /
 * Stream once those accounts exist — callers only depend on this class's
 * public methods, not on where bytes physically live.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await mkdir(PUBLIC_DIR, { recursive: true });
    await mkdir(PROTECTED_DIR, { recursive: true });
  }

  async savePublic(
    buffer: Buffer,
    originalName: string,
  ): Promise<{ url: string; storedName: string }> {
    const storedName = `${randomUUID()}${extname(originalName)}`;
    await writeFile(join(PUBLIC_DIR, storedName), buffer);
    // Absolute: this file is served by the API, but rendered on a different
    // origin (the admin/student app), so a relative path would 404 there.
    const base = this.config.get<string>(
      'API_PUBLIC_URL',
      'http://localhost:4000',
    );
    return { url: `${base}/public/${storedName}`, storedName };
  }

  async saveProtected(
    buffer: Buffer,
    originalName: string,
  ): Promise<{ storedPath: string; storedName: string; size: number }> {
    const storedName = `${randomUUID()}${extname(originalName)}`;
    const fullPath = join(PROTECTED_DIR, storedName);
    await writeFile(fullPath, buffer);
    const info = await stat(fullPath);
    return {
      storedPath: `protected/${storedName}`,
      storedName,
      size: info.size,
    };
  }

  getProtectedStream(storedPath: string) {
    const fullPath = join(STORAGE_ROOT, storedPath);
    if (!existsSync(fullPath)) {
      return null;
    }
    return createReadStream(fullPath);
  }

  async deletePublic(url: string): Promise<void> {
    const storedName = url.split('/public/').pop();
    if (!storedName) return;
    await unlink(join(PUBLIC_DIR, storedName)).catch(() => undefined);
  }

  async deleteProtected(storedPath: string): Promise<void> {
    await unlink(join(STORAGE_ROOT, storedPath)).catch(() => undefined);
  }
}

export { PUBLIC_DIR };
