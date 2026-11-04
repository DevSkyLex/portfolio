import { API_PREFIX } from '@vfortin/web-http';

/**
 * Constant ADMIN_PROFILE_ENDPOINT
 *
 * @description
 * Administration endpoint of the profile (« Informations »).
 */
export const ADMIN_PROFILE_ENDPOINT: string = `${API_PREFIX}/content/admin/profile`;

/**
 * Constant ADMIN_LEGAL_ENDPOINT
 *
 * @description
 * Administration endpoint of the legal documents, followed by `/notice` or `/privacy`.
 */
export const ADMIN_LEGAL_ENDPOINT: string = `${API_PREFIX}/content/admin/legal`;
