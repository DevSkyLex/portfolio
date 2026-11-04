import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  AdminLegalDocumentDto,
  AdminProfileDto,
  LegalDocumentRevisionRequest,
  ProfileRevisionRequest,
} from '@vfortin/content-contracts';
import { type Observable, map } from 'rxjs';
import {
  toAdminLegalDocument,
  toAdminProfile,
} from '@internal/content-web-data-access/lib/admin/adapters/admin-site-texts/admin-site-texts.adapter';
import {
  ADMIN_LEGAL_ENDPOINT,
  ADMIN_PROFILE_ENDPOINT,
} from '@internal/content-web-data-access/lib/admin/constants/admin-site-texts-endpoint.constants';
import type { AdminLegalDocument } from '@internal/content-web-data-access/lib/admin/models/admin-legal-document/admin-legal-document.interface';
import type { AdminProfile } from '@internal/content-web-data-access/lib/admin/models/admin-profile/admin-profile.interface';
import type { LegalDocumentKind } from '@internal/content-web-data-access/lib/admin/models/legal-document-kind/legal-document-kind.type';
import { ifMatch } from '@internal/content-web-data-access/lib/admin/utils/if-match/if-match.utils';

/**
 * Service AdminSiteTextsApiService
 * @class AdminSiteTextsApiService
 *
 * @description
 * Administrator HTTP adapter of the profile (« Informations ») and the legal documents (« Légal »):
 * reads, and revisions quoting the version read in `If-Match`.
 */
@Injectable({ providedIn: 'root' })
export class AdminSiteTextsApiService {
  // #region Properties
  /**
   * Property http
   * @readonly
   *
   * @description
   * Angular HTTP client, decorated by the admin interceptors.
   *
   * @type {HttpClient}
   */
  private readonly http: HttpClient = inject<HttpClient>(HttpClient);
  // #endregion

  // #region Methods
  /**
   * Method profile
   * @method profile
   *
   * @description
   * Loads the profile.
   *
   * @returns {Observable<AdminProfile>} Profile.
   */
  public profile(): Observable<AdminProfile> {
    return this.http.get<AdminProfileDto>(ADMIN_PROFILE_ENDPOINT).pipe(map(toAdminProfile));
  }

  /**
   * Method reviseProfile
   * @method reviseProfile
   *
   * @description
   * Saves the profile if it still has the version read.
   *
   * @param {AdminProfile} current - Profile read before editing.
   * @param {ProfileRevisionRequest} body - New content.
   *
   * @returns {Observable<AdminProfile>} Saved profile.
   */
  public reviseProfile(
    current: AdminProfile,
    body: ProfileRevisionRequest,
  ): Observable<AdminProfile> {
    return this.http
      .put<AdminProfileDto>(ADMIN_PROFILE_ENDPOINT, body, { headers: ifMatch(current.version) })
      .pipe(map(toAdminProfile));
  }

  /**
   * Method legal
   * @method legal
   *
   * @description
   * Loads a legal document.
   *
   * @param {LegalDocumentKind} kind - Document.
   *
   * @returns {Observable<AdminLegalDocument>} Document.
   */
  public legal(kind: LegalDocumentKind): Observable<AdminLegalDocument> {
    return this.http
      .get<AdminLegalDocumentDto>(`${ADMIN_LEGAL_ENDPOINT}/${kind}`)
      .pipe(map(toAdminLegalDocument));
  }

  /**
   * Method reviseLegal
   * @method reviseLegal
   *
   * @description
   * Saves a legal document if it still has the version read.
   *
   * @param {AdminLegalDocument} current - Document read before editing.
   * @param {LegalDocumentRevisionRequest} body - New documents.
   *
   * @returns {Observable<AdminLegalDocument>} Saved document.
   */
  public reviseLegal(
    current: AdminLegalDocument,
    body: LegalDocumentRevisionRequest,
  ): Observable<AdminLegalDocument> {
    return this.http
      .put<AdminLegalDocumentDto>(`${ADMIN_LEGAL_ENDPOINT}/${current.kind}`, body, {
        headers: ifMatch(current.version),
      })
      .pipe(map(toAdminLegalDocument));
  }
  // #endregion
}
