import {
  MediaMissingError,
  UnsupportedMediaError,
} from '@internal/content-application/lib/errors/application-error';
import type { MediaRecord } from '@internal/content-application/lib/ports/content/content.ports';
import {
  MEDIA_GRACE_MS,
  PurgeMedia,
} from '@internal/content-application/lib/use-cases/purge-media/purge-media.use-case';
import { UploadMedia } from '@internal/content-application/lib/use-cases/upload-media/upload-media.use-case';
import {
  FakeImageProcessor,
  FixedClock,
  InMemoryMediaRepository,
  InMemoryMediaStorage,
  SequenceIds,
  mediaRecord,
} from '@internal/content-application/lib/testing/content.fakes';

/**
 * Function bytes
 *
 * @description
 * Encodes a test payload.
 *
 * @param {string} value - Payload text.
 * @returns {Uint8Array} Payload bytes.
 */
const bytes = (value: string): Uint8Array => new TextEncoder().encode(value);

/**
 * Interface MediaHarness
 *
 * @description
 * Fakes and use cases of the media tests.
 */
interface MediaHarness {
  readonly media: InMemoryMediaRepository;
  readonly storage: InMemoryMediaStorage;
  readonly processor: FakeImageProcessor;
  readonly clock: FixedClock;
  readonly upload: UploadMedia;
  readonly purge: PurgeMedia;
}

/**
 * Function setup
 *
 * @description
 * Wires the media use cases to fresh fakes.
 *
 * @param {readonly MediaRecord[]} initial - Initial media rows.
 * @returns {MediaHarness} Fakes and use cases.
 */
function setup(initial: readonly MediaRecord[] = []): MediaHarness {
  const media: InMemoryMediaRepository = new InMemoryMediaRepository(initial);
  const storage: InMemoryMediaStorage = new InMemoryMediaStorage();
  const processor: FakeImageProcessor = new FakeImageProcessor();
  const clock: FixedClock = new FixedClock();
  return {
    media,
    storage,
    processor,
    clock,
    upload: new UploadMedia(media, processor, storage, new SequenceIds(), clock),
    purge: new PurgeMedia(media, storage, clock),
  };
}

describe('UploadMedia', (): void => {
  it('writes the files, then records the media, unlinked until a project saves it', async (): Promise<void> => {
    const { upload, media, storage, clock } = setup();
    const record: MediaRecord = await upload.execute(bytes('IMGW photo'));
    expect(record).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      width: 2400,
      height: 600,
      bytes: 3,
      sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      hasSmall: true,
      createdAt: clock.now(),
      unlinkedAt: clock.now(),
    });
    expect(storage.log).toEqual([`put:${record.id}`]);
    expect(storage.files.get(record.id)?.small).not.toBeNull();
    expect(media.rows.get(record.id)).toEqual(record);
    await expect(upload.execute(bytes('IMG small'))).resolves.toMatchObject({ hasSmall: false });
  });

  it('returns the media already uploaded with the same bytes', async (): Promise<void> => {
    const { upload, processor, clock, media } = setup();
    const first: MediaRecord = await upload.execute(bytes('IMG same'));
    clock.current = new Date('2026-11-05T10:00:00Z');
    const again: MediaRecord = await upload.execute(bytes('IMG same'));
    expect(again).toMatchObject({ id: first.id, unlinkedAt: clock.now() });
    expect(media.rows.get(first.id)?.unlinkedAt).toEqual(clock.now());
    await media.relink([first.id]);
    await expect(upload.execute(bytes('IMG same'))).resolves.toMatchObject({ unlinkedAt: null });
    expect(processor.calls).toBe(1);
  });

  it('removes the files when the row cannot be inserted', async (): Promise<void> => {
    const { upload, media, storage } = setup();
    media.failInsert = new Error('database down');
    await expect(upload.execute(bytes('IMG photo'))).rejects.toThrow('database down');
    const id: string = '00000000-0000-4000-8000-000000000001';
    expect(storage.log).toEqual([`put:${id}`, `remove:${id}`]);
    expect(storage.files.size).toBe(0);
  });

  it('refuses an empty file and an unsupported format without storing anything', async (): Promise<void> => {
    const { upload, storage, media } = setup();
    await expect(upload.execute(new Uint8Array())).rejects.toBeInstanceOf(MediaMissingError);
    await expect(upload.execute(bytes('<svg/>'))).rejects.toBeInstanceOf(UnsupportedMediaError);
    expect(storage.log).toEqual([]);
    expect(media.rows.size).toBe(0);
  });

  it('processes one upload at a time and keeps going after a failure', async (): Promise<void> => {
    const { upload, processor } = setup();
    const results: PromiseSettledResult<MediaRecord>[] = await Promise.allSettled([
      upload.execute(bytes('IMG a')),
      upload.execute(bytes('bad')),
      upload.execute(bytes('IMG c')),
    ]);
    expect(results.map((r: PromiseSettledResult<MediaRecord>): string => r.status)).toEqual([
      'fulfilled',
      'rejected',
      'fulfilled',
    ]);
    expect(processor.maxActive).toBe(1);
  });
});

describe('PurgeMedia', (): void => {
  it('deletes the row, then the files, of media unreferenced for more than seven days', async (): Promise<void> => {
    const clock: FixedClock = new FixedClock();
    const old: Date = new Date(clock.now().getTime() - MEDIA_GRACE_MS - 1);
    const recent: Date = new Date(clock.now().getTime() - MEDIA_GRACE_MS + 60_000);
    const { purge, media, storage } = setup([
      mediaRecord('stale', { unlinkedAt: old }),
      mediaRecord('recent', { unlinkedAt: recent }),
      mediaRecord('linked'),
      mediaRecord('referenced', { unlinkedAt: old }),
    ]);
    media.referenced = (id: string): boolean => id === 'referenced';
    await expect(purge.execute()).resolves.toEqual({ purged: ['stale'] });
    expect([...media.rows.keys()]).toEqual(['recent', 'linked', 'referenced']);
    expect(storage.log).toEqual(['remove:stale']);
  });

  it('keeps a media referenced again between the listing and the deletion', async (): Promise<void> => {
    const old: Date = new Date('2026-01-01T00:00:00Z');
    const { purge, media, storage } = setup([mediaRecord('raced', { unlinkedAt: old })]);
    const stale: InMemoryMediaRepository['stale'] = media.stale.bind(media);
    media.stale = async (before: Date): Promise<MediaRecord[]> => {
      const candidates: MediaRecord[] = await stale(before);
      await media.relink(['raced']);
      return candidates;
    };
    await expect(purge.execute()).resolves.toEqual({ purged: [] });
    expect(media.rows.has('raced')).toBe(true);
    expect(storage.log).toEqual([]);
  });
});
