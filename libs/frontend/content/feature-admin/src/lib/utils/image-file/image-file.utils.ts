import { ADMIN_MEDIA_LIMITS } from '@vfortin/content-web-data-access/admin';

/**
 * Function imageFileError
 *
 * @description
 * Checks a chosen, dropped or pasted file against the media upload limits before sending it, so that
 * a file the API would refuse (415, 413) is reported at once.
 *
 * @param {File} file - Candidate image.
 *
 * @returns {string | null} The localized reason of the refusal, or `null` when the file can be sent.
 */
export function imageFileError(file: File): string | null {
  const name: string = file.name;
  if (!ADMIN_MEDIA_LIMITS.types.includes(file.type)) {
    return $localize`:@@admin.article.imageFile.type:« ${name}:name: » n’est pas une image acceptée : JPEG, PNG, WebP, AVIF ou GIF.`;
  }
  if (file.size > ADMIN_MEDIA_LIMITS.bytes) {
    return $localize`:@@admin.article.imageFile.size:« ${name}:name: » dépasse 10 Mo.`;
  }
  return null;
}
