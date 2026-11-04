import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DiskMediaStorage } from '@internal/content-adapters-out/lib/media/disk-media/disk-media.storage';

/**
 * Constant ID
 *
 * @description
 * Media identifier of the tests.
 */
const ID: string = '3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90';

describe('DiskMediaStorage', (): void => {
  let root: string;
  let directory: string;

  beforeEach((): void => {
    root = mkdtempSync(join(tmpdir(), 'content-media-'));
    directory = join(root, 'media');
  });

  afterEach((): void => {
    rmSync(root, { recursive: true, force: true });
  });

  it('writes both renditions under the media name, world-readable, without temporary files', async (): Promise<void> => {
    const storage: DiskMediaStorage = new DiskMediaStorage(directory);
    await storage.put(ID, { full: new Uint8Array([1, 2, 3]), small: new Uint8Array([4]) });
    expect(readdirSync(directory).sort()).toEqual([`${ID}-960.webp`, `${ID}.webp`]);
    expect([...readFileSync(join(directory, `${ID}.webp`))]).toEqual([1, 2, 3]);
    if (process.platform !== 'win32') {
      expect(statSync(join(directory, `${ID}.webp`)).mode & 0o777).toBe(0o644);
    }
    await storage.remove(ID);
    expect(readdirSync(directory)).toEqual([]);
    await expect(storage.remove(ID)).resolves.toBeUndefined();
  });

  it('writes only the full rendition when there is no small one', async (): Promise<void> => {
    const storage: DiskMediaStorage = new DiskMediaStorage(directory);
    await storage.put(ID, { full: new Uint8Array([1]), small: null });
    expect(readdirSync(directory)).toEqual([`${ID}.webp`]);
  });

  it('removes what it wrote when a write fails', async (): Promise<void> => {
    const storage: DiskMediaStorage = new DiskMediaStorage(directory);
    const failing: Uint8Array = new Uint8Array([1]);
    // A full rendition writeFile rejects, once the small rendition is already written.
    await expect(
      storage.put(ID, { full: 42 as unknown as Uint8Array, small: failing }),
    ).rejects.toThrow();
    expect(existsSync(join(directory, `${ID}-960.webp`))).toBe(false);
  });

  it('refuses an identifier that is not a media UUID', async (): Promise<void> => {
    const storage: DiskMediaStorage = new DiskMediaStorage(directory);
    await expect(
      storage.put('../escape', { full: new Uint8Array([1]), small: null }),
    ).rejects.toThrow('Invalid media identifier');
  });
});
