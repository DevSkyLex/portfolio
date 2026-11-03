import { type HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import type { EnvironmentProviders } from '@angular/core';

/**
 * Constant API_PREFIX
 *
 * @description
 * Same-origin prefix routed by Nginx to the backend services.
 *
 * @type {string}
 */
export const API_PREFIX = '/api' as const;

/**
 * Function requestIdInterceptor
 *
 * @description
 * Adds a UUID request identifier to API requests that do not already carry one; non-API requests
 * and caller-supplied identifiers pass through unchanged.
 *
 * @type {HttpInterceptorFn}
 */
export const requestIdInterceptor: HttpInterceptorFn = (request, next) =>
  request.url.startsWith(API_PREFIX) && !request.headers.has('x-request-id')
    ? next(request.clone({ setHeaders: { 'x-request-id': crypto.randomUUID() } }))
    : next(request);

/**
 * Function provideApiHttp
 *
 * @description
 * Provides Angular's HTTP client with the request-id interceptor followed by context interceptors.
 * The shell supplies admin authentication so public features need not load identity behavior.
 *
 * @param {readonly HttpInterceptorFn[]} interceptors - Additional interceptors applied after the request-id interceptor.
 *
 * @returns {EnvironmentProviders} HTTP client providers configured for same-origin API calls.
 */
export function provideApiHttp(
  interceptors: readonly HttpInterceptorFn[] = [],
): EnvironmentProviders {
  return provideHttpClient(withInterceptors([requestIdInterceptor, ...interceptors]));
}
