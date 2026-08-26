import { ProgressService } from './progress.service';
import type { PrismaService } from '../prisma/prisma.service';

function buildService() {
  const savedData: { current?: { completed: boolean } } = {};

  const upsert = jest
    .fn()
    .mockImplementation((args: { create: { completed: boolean } }) => {
      savedData.current = args.create;
      return Promise.resolve(args.create);
    });
  const findUnique = jest.fn().mockResolvedValue(null);
  const create = jest.fn().mockResolvedValue({});
  const deleteFn = jest.fn().mockResolvedValue({});

  const prisma = {
    watchProgress: { upsert, findUnique },
    bookmark: { findUnique, create, delete: deleteFn },
  };

  return {
    service: new ProgressService(prisma as unknown as PrismaService),
    savedData,
    findUnique,
    create,
    deleteFn,
  };
}

describe('ProgressService.saveProgress', () => {
  it('marks a lecture completed past the 92% threshold', async () => {
    const { service, savedData } = buildService();

    await service.saveProgress('user-1', 'lecture-1', 95, 100);

    expect(savedData.current?.completed).toBe(true);
  });

  it('leaves a lecture incomplete below the threshold', async () => {
    const { service, savedData } = buildService();

    await service.saveProgress('user-1', 'lecture-1', 50, 100);

    expect(savedData.current?.completed).toBe(false);
  });

  it('never marks completed when duration is unknown', async () => {
    const { service, savedData } = buildService();

    await service.saveProgress('user-1', 'lecture-1', 120, 0);

    expect(savedData.current?.completed).toBe(false);
  });
});

describe('ProgressService.toggleBookmark', () => {
  it('creates a bookmark when none exists', async () => {
    const { service, findUnique, create } = buildService();
    findUnique.mockResolvedValue(null);

    const result = await service.toggleBookmark('user-1', 'lecture-1');

    expect(result).toEqual({ bookmarked: true });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('removes an existing bookmark', async () => {
    const { service, findUnique, deleteFn } = buildService();
    findUnique.mockResolvedValue({ id: 'bookmark-1' });

    const result = await service.toggleBookmark('user-1', 'lecture-1');

    expect(result).toEqual({ bookmarked: false });
    expect(deleteFn).toHaveBeenCalledTimes(1);
  });
});
