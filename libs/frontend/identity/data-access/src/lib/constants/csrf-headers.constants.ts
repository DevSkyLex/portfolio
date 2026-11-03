import { HttpHeaders } from '@angular/common/http';

/**
 * Constant CSRF_HEADERS
 *
 * @description
 * Header required by the code, refresh and logout endpoints to satisfy the API's CSRF check.
 *
 * @type {HttpHeaders}
 */
export const CSRF_HEADERS: HttpHeaders = new HttpHeaders({ 'x-csrf': '1' });
