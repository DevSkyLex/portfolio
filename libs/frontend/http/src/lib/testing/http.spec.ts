import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  type StoreError,
  toStoreError,
} from '@internal/web-http/lib/errors/store-error/store-error';
import { provideApiHttp } from '@internal/web-http/lib/provide-api-http';

describe('toStoreError', () => {
  it('keeps the code and the field errors of the problem+json', () => {
    const error: StoreError = toStoreError(
      new HttpErrorResponse({
        status: 400,
        error: {
          code: 'request.invalid',
          detail: 'internal',
          errors: [{ field: 'email', message: 'invalid' }, { field: 3 }],
        },
      }),
    );
    expect(error).toMatchObject({
      code: 'request.invalid',
      status: 400,
      retryable: false,
      fieldErrors: [{ field: 'email', message: 'invalid' }],
    });
  });

  it.each([
    [0, true],
    [429, true],
    [503, true],
    [422, false],
  ])('status %i: retryable = %s', (status, retryable) => {
    expect(toStoreError(new HttpErrorResponse({ status })).retryable).toBe(retryable);
  });

  it('normalizes an error that does not come from the network', () => {
    expect(toStoreError(new Error('x'))).toMatchObject({ code: null, status: null });
  });
});

describe('provideApiHttp', () => {
  it('adds an x-request-id to API calls only', () => {
    TestBed.configureTestingModule({ providers: [provideApiHttp(), provideHttpClientTesting()] });
    const http: HttpClient = TestBed.inject<HttpClient>(HttpClient);
    const backend: HttpTestingController =
      TestBed.inject<HttpTestingController>(HttpTestingController);
    http.get('/api/contact/x').subscribe();
    http.get('/assets/x.json').subscribe();
    expect(backend.expectOne('/api/contact/x').request.headers.get('x-request-id')).toMatch(
      /^[\w-]{36}$/,
    );
    expect(backend.expectOne('/assets/x.json').request.headers.has('x-request-id')).toBe(false);
  });
});
