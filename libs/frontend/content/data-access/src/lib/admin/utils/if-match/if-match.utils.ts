import { HttpHeaders } from '@angular/common/http';

/**
 * Function ifMatch
 *
 * @description
 * Creates the optimistic-lock header expected by revision, publication, and unpublication endpoints.
 *
 * @param {number} version - Project version loaded by the editor.
 *
 * @returns {HttpHeaders} Header carrying the quoted version in `If-Match`.
 */
export const ifMatch: (version: number) => HttpHeaders = (version: number): HttpHeaders =>
  new HttpHeaders({ 'if-match': `"${version}"` });
