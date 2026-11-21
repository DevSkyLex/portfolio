import { ADMIN_MEDIA_LIMITS } from '@vfortin/content-web-data-access/admin';

/**
 * Function imageFileError
 *
 * @description
 * Checks a chosen, dropped or pasted file against the media upload limits before sending it, so that
 * a file the API would refuse (415, 413) is reported at once. Article figures also accept an MP4
 * video (D57); a cover takes images only.
 *
 * @param {File} file - Candidate file.
 * @param {boolean} [videos] - Whether an MP4 video is accepted too.
 *
 * @returns {string | null} The localized reason of the refusal, or `null` when the file can be sent.
 */
export function imageFileError(file: File, videos: boolean = false): string | null {
  const name: string = file.name;
  if (videos && ADMIN_MEDIA_LIMITS.videoTypes.includes(file.type)) {
    return file.size > ADMIN_MEDIA_LIMITS.videoBytes
      ? $localize`:@@admin.article.videoFile.size:« ${name}:name: » dépasse 50 Mo.`
      : null;
  }
  if (!ADMIN_MEDIA_LIMITS.types.includes(file.type)) {
    return videos
      ? $localize`:@@admin.article.mediaFile.type:« ${name}:name: » n’est ni une image ni une vidéo acceptée : JPEG, PNG, WebP, AVIF, GIF ou MP4.`
      : $localize`:@@admin.article.imageFile.type:« ${name}:name: » n’est pas une image acceptée : JPEG, PNG, WebP, AVIF ou GIF.`;
  }
  if (file.size > ADMIN_MEDIA_LIMITS.bytes) {
    return $localize`:@@admin.article.imageFile.size:« ${name}:name: » dépasse 10 Mo.`;
  }
  return null;
}
