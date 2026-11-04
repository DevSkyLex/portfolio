import type { MediaFiles, MediaStorage } from '@vfortin/content-application';
import { chmod, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Constant MEDIA_ID
 *
 * @description
 * Shape of a media identifier; any other value would let a caller name a path outside the directory.
 */
const MEDIA_ID: RegExp = /^[0-9a-f-]{36}$/;

/**
 * Class DiskMediaStorage
 * @class DiskMediaStorage
 *
 * @description
 * Stores media files in one directory (`CONTENT_MEDIA_DIR`), served read-only at `/media/` by Nginx
 * or, in development, by the service (D40). Files are world-readable (0644) for the Nginx user.
 */
export class DiskMediaStorage implements MediaStorage {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Receives the media directory, created on the first write when absent.
   *
   * @param {string} directory - Media directory.
   */
  public constructor(private readonly directory: string) {}
  // #endregion

  // #region Methods
  /**
   * Method put
   * @method put
   *
   * @description
   * Writes `<id>-960.webp` (when present) then `<id>.webp`, each as a `.tmp` file renamed into
   * place, so a reader never sees a partial file; on failure, removes whatever was written.
   *
   * @param {string} id - Media identifier.
   * @param {MediaFiles} files - WebP bytes.
   * @returns {Promise<void>} Completion once both files are in place.
   */
  public async put(id: string, files: MediaFiles): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    try {
      if (files.small !== null) {
        await this.write(this.path(id, '-960.webp'), files.small);
      }
      await this.write(this.path(id, '.webp'), files.full);
    } catch (error: unknown) {
      await this.remove(id);
      throw error;
    }
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Removes the files of a media and their temporary files; absent files are ignored.
   *
   * @param {string} id - Media identifier.
   * @returns {Promise<void>} Completion after removal.
   */
  public async remove(id: string): Promise<void> {
    await Promise.all(
      ['.webp', '-960.webp', '.webp.tmp', '-960.webp.tmp'].map((suffix: string): Promise<void> =>
        rm(this.path(id, suffix), { force: true }),
      ),
    );
  }

  /**
   * Method write
   * @method write
   *
   * @description
   * Writes a temporary file with mode 0644 (set again after writing, whatever the umask), then
   * renames it to its final name.
   *
   * @param {string} target - Final path.
   * @param {Uint8Array} data - File bytes.
   * @returns {Promise<void>} Completion after the rename.
   */
  private async write(target: string, data: Uint8Array): Promise<void> {
    const temporary: string = `${target}.tmp`;
    await writeFile(temporary, data, { mode: 0o644 });
    await chmod(temporary, 0o644);
    await rename(temporary, target);
  }

  /**
   * Method path
   * @method path
   *
   * @description
   * Builds the path of a media file after checking the identifier.
   *
   * @param {string} id - Media identifier.
   * @param {string} suffix - File suffix.
   * @returns {string} File path.
   */
  private path(id: string, suffix: string): string {
    if (!MEDIA_ID.test(id)) {
      throw new Error(`Invalid media identifier "${id}".`);
    }
    return join(this.directory, `${id}${suffix}`);
  }
  // #endregion
}
