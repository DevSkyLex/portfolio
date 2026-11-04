import { provideHttpClient } from '@angular/common/http';
import {
  type TestRequest,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { TwoFactorSetupResponse, TwoFactorStatusResponse } from '@vfortin/identity-contracts';
import { firstValueFrom } from 'rxjs';
import { TwoFactorApiService } from '@internal/identity-web-data-access/lib/services/two-factor-api/two-factor-api.service';

/**
 * Constant SETUP
 *
 * @description
 * Same material as the contract fixture `two-factor-setup-response.fixture.json`.
 */
const SETUP: TwoFactorSetupResponse = {
  secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
  provisioningUri:
    'otpauth://totp/Portfolio:admin%40example.test?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Portfolio',
};

/**
 * Function setup
 *
 * @description
 * Provides the service over the HTTP testing backend.
 *
 * @returns {{ api: TwoFactorApiService; backend: HttpTestingController }} Service and backend.
 */
function setup(): { api: TwoFactorApiService; backend: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    api: TestBed.inject<TwoFactorApiService>(TwoFactorApiService),
    backend: TestBed.inject<HttpTestingController>(HttpTestingController),
  };
}

describe('TwoFactorApiService', () => {
  afterEach(() => TestBed.inject<HttpTestingController>(HttpTestingController).verify());

  it('reads the status with a GET on /api/auth/totp', async () => {
    const { api, backend }: ReturnType<typeof setup> = setup();
    const answer: Promise<TwoFactorStatusResponse> = firstValueFrom(api.status());
    const call: TestRequest = backend.expectOne('/api/auth/totp');
    expect(call.request.method).toBe('GET');
    call.flush({ enabled: false });
    await expect(answer).resolves.toEqual({ enabled: false });
  });

  it('posts the password to the setup route and returns the pending material', async () => {
    const { api, backend }: ReturnType<typeof setup> = setup();
    const answer: Promise<TwoFactorSetupResponse> = firstValueFrom(
      api.setup({ password: 'a-strong-password' }),
    );
    const call: TestRequest = backend.expectOne('/api/auth/totp/setup');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual({ password: 'a-strong-password' });
    call.flush(SETUP);
    await expect(answer).resolves.toEqual(SETUP);
  });

  it('posts the code to the enable route', async () => {
    const { api, backend }: ReturnType<typeof setup> = setup();
    const answer: Promise<TwoFactorStatusResponse> = firstValueFrom(api.enable({ totp: '123456' }));
    const call: TestRequest = backend.expectOne('/api/auth/totp/enable');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual({ totp: '123456' });
    call.flush({ enabled: true });
    await expect(answer).resolves.toEqual({ enabled: true });
  });

  it('posts both factors to the disable route and lets a refusal through', async () => {
    const { api, backend }: ReturnType<typeof setup> = setup();
    const answer: Promise<TwoFactorStatusResponse> = firstValueFrom(
      api.disable({ password: 'a-strong-password', totp: '654321' }),
    );
    const call: TestRequest = backend.expectOne('/api/auth/totp/disable');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual({ password: 'a-strong-password', totp: '654321' });
    call.flush(
      { status: 422, code: 'identity.totp-invalid', title: 'Invalid code' },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await expect(answer).rejects.toMatchObject({ status: 422 });
  });
});
