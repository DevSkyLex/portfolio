import {
  type TestRequest,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CONTACT_LIMITS, ContactMessageRequestSchema } from '@vfortin/contact-contracts';
import { type ServerFieldError, provideApiHttp } from '@vfortin/web-http';
import { toContactMessageRequest } from '@internal/contact-web-data-access/lib/adapters/contact-message-request/contact-message-request.adapter';
import { CONTACT_FORM_LIMITS } from '@internal/contact-web-data-access/lib/constants/contact-form-limits.constants';
import type { ContactRequest } from '@internal/contact-web-data-access/lib/models/contact-request/contact-request.interface';
import { ContactFormStore } from '@internal/contact-web-data-access/lib/state/contact-form/contact-form.store';

/**
 * Constant request
 *
 * @description
 * French contact form fixture with whitespace-only company input to verify contract adaptation.
 *
 * @type {ContactRequest}
 */
const request: ContactRequest = {
  name: 'Camille Martin',
  company: '  ',
  email: ' camille@exemple.fr ',
  subject: 'project',
  message: 'Bonjour, je voudrais discuter d’un projet web.',
  locale: 'fr',
  website: '',
};

/**
 * Function setup
 *
 * @description
 * Configures the contact store with API providers and returns its typed store and HTTP test backend.
 *
 * @returns {{ store: InstanceType<typeof ContactFormStore>; backend: HttpTestingController }} Test dependencies for one contact data-access case.
 */
function setup(): { store: InstanceType<typeof ContactFormStore>; backend: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [provideApiHttp(), provideHttpClientTesting(), ContactFormStore],
  });
  return {
    store: TestBed.inject<InstanceType<typeof ContactFormStore>>(ContactFormStore),
    backend: TestBed.inject<HttpTestingController>(HttpTestingController),
  };
}

describe('contact contract', () => {
  it('keeps the contract limits', () => {
    expect(CONTACT_FORM_LIMITS).toEqual(CONTACT_LIMITS);
  });

  it('produces a request that matches the contract', () => {
    expect(ContactMessageRequestSchema.safeParse(toContactMessageRequest(request)).success).toBe(
      true,
    );
    expect(toContactMessageRequest({ ...request, company: ' Atelier Nord ' }).company).toBe(
      'Atelier Nord',
    );
  });
});

describe('ContactFormStore', () => {
  it('goes from pending to sent', async () => {
    const { store, backend }: ReturnType<typeof setup> = setup();
    const result: Promise<readonly ServerFieldError[]> = store.send(request);
    expect(store.sending()).toBe(true);
    const call: TestRequest = backend.expectOne('/api/contact/messages');
    expect(call.request.body).toMatchObject({ company: null, website: '' });
    call.flush({ status: 'received' }, { status: 202, statusText: 'Accepted' });
    await expect(result).resolves.toEqual([]);
    expect(store.sent()).toBe(true);
    expect(store.sentTo()).toBe('camille@exemple.fr');
    store.reset();
    expect(store.sendCallState().status).toBe('idle');
  });

  it('returns the server field errors', async () => {
    const { store, backend }: ReturnType<typeof setup> = setup();
    const result: Promise<readonly ServerFieldError[]> = store.send(request);
    backend
      .expectOne('/api/contact/messages')
      .flush(
        { code: 'request.invalid', errors: [{ field: 'email', message: 'invalid' }] },
        { status: 400, statusText: 'Bad Request' },
      );
    await expect(result).resolves.toEqual([{ field: 'email', message: 'invalid' }]);
    expect(store.error()?.code).toBe('request.invalid');
  });
});
