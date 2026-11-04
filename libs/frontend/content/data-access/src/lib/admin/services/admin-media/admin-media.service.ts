import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { MediaDto } from '@vfortin/content-contracts';
import { type Observable, map } from 'rxjs';
import { toAdminMedia } from '@internal/content-web-data-access/lib/admin/adapters/admin-media/admin-media.adapter';
import {
  ADMIN_MEDIA_ENDPOINT,
  ADMIN_MEDIA_LIMITS,
} from '@internal/content-web-data-access/lib/admin/constants/admin-media.constants';
import type { AdminMedia } from '@internal/content-web-data-access/lib/admin/models/admin-media/admin-media.interface';

/**
 * Service AdminMediaApiService
 * @class AdminMediaApiService
 *
 * @description
 * Uploads images to the same-origin administrator media API (D40); the identity interceptor supplies
 * the access token and the server re-encodes the file to WebP.
 */
@Injectable({ providedIn: 'root' })
export class AdminMediaApiService {
  // #region Properties
  /**
   * Property http
   * @readonly
   *
   * @description
   * Angular HTTP client used for the upload.
   *
   * @type {HttpClient}
   */
  private readonly http: HttpClient = inject<HttpClient>(HttpClient);
  // #endregion

  // #region Methods
  /**
   * Method upload
   * @method upload
   *
   * @description
   * Sends one image as `multipart/form-data` in the `file` field. No `Content-Type` is set: the browser
   * writes it with the multipart boundary.
   *
   * @param {File} file - Image chosen, dropped or pasted by the administrator.
   *
   * @returns {Observable<AdminMedia>} Stored media, or the HTTP error (413, 415, 400) untouched.
   */
  public upload(file: File): Observable<AdminMedia> {
    const body: FormData = new FormData();
    body.append(ADMIN_MEDIA_LIMITS.field, file, file.name);
    return this.http.post<MediaDto>(ADMIN_MEDIA_ENDPOINT, body).pipe(map(toAdminMedia));
  }
  // #endregion
}
