import type { MediaDto } from '@vfortin/content-contracts';
import type { AdminMedia } from '@internal/content-web-data-access/lib/admin/models/admin-media/admin-media.interface';

/**
 * Function toAdminMedia
 *
 * @description
 * Projects an uploaded or referenced media into the administrator view model.
 *
 * @param {MediaDto} dto - Media returned by the API.
 *
 * @returns {AdminMedia} Independent media view.
 */
export function toAdminMedia(dto: MediaDto): AdminMedia {
  return { id: dto.id, src: dto.src, width: dto.width, height: dto.height };
}
