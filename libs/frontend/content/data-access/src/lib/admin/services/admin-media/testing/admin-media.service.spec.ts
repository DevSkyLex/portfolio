import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import type { AdminMedia } from '@internal/content-web-data-access/lib/admin/models/admin-media/admin-media.interface';
import { AdminMediaApiService } from '@internal/content-web-data-access/lib/admin/services/admin-media/admin-media.service';

/**
 * Constant MEDIA
 *
 * @description
 * Media answered by the upload endpoint.
 */
const MEDIA: AdminMedia = {
  id: '3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90',
  src: '/media/3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90.webp',
  width: 1600,
  height: 900,
};

/**
 * Function setup
 *
 * @description
 * Creates the service with the HTTP testing backend.
 *
 * @returns {{ api: AdminMediaApiService; backend: HttpTestingController }} Service and backend.
 */
function setup(): { api: AdminMediaApiService; backend: HttpTestingController } {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return {
    api: TestBed.inject<AdminMediaApiService>(AdminMediaApiService),
    backend: TestBed.inject<HttpTestingController>(HttpTestingController),
  };
}

describe('AdminMediaApiService', (): void => {
  afterEach((): void => TestBed.inject<HttpTestingController>(HttpTestingController).verify());

  it('posts the file as multipart form data without setting its content type', async (): Promise<void> => {
    const { api, backend } = setup();
    const file: File = new File(['png'], 'ecran.png', { type: 'image/png' });
    const uploading: Promise<AdminMedia> = firstValueFrom(api.upload(file));
    const call: TestRequest = backend.expectOne('/api/content/admin/media');
    expect(call.request.method).toBe('POST');
    expect(call.request.headers.has('content-type')).toBe(false);
    const body: unknown = call.request.body;
    if (!(body instanceof FormData)) throw new Error('multipart body expected');
    expect([...body.keys()]).toEqual(['file']);
    expect((body.get('file') as File).name).toBe('ecran.png');
    call.flush({ ...MEDIA, extra: true });
    await expect(uploading).resolves.toEqual(MEDIA);
  });

  it('lets a refused upload through untouched', async (): Promise<void> => {
    const { api, backend } = setup();
    const uploading: Promise<AdminMedia> = firstValueFrom(
      api.upload(new File(['x'], 'big.png', { type: 'image/png' })),
    );
    backend
      .expectOne('/api/content/admin/media')
      .flush({ code: 'content.media-too-large' }, { status: 413, statusText: 'Payload Too Large' });
    await expect(uploading).rejects.toMatchObject({
      status: 413,
      error: { code: 'content.media-too-large' },
    });
  });
});
