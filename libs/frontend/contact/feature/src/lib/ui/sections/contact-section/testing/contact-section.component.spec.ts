import {
  type TestRequest,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { type ComponentFixture, DeferBlockState, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { ContactSectionComponent } from '@internal/contact-web-feature/lib/ui/sections/contact-section/contact-section.component';

/**
 * Function setup
 *
 * @description
 * Creates the contact section with an English locale and returns its fixture, DOM root, interaction
 * helpers, and HTTP test backend.
 *
 * @returns Initialized component fixture, its root element, form interaction helpers, and HTTP test backend.
 */
async function setup(): Promise<{
  fixture: ComponentFixture<ContactSectionComponent>;
  root: HTMLElement;
  type: (id: string, value: string) => Promise<void>;
  submit: () => Promise<void>;
  backend: HttpTestingController;
}> {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideRouter([]),
      provideHttpClientTesting(),
      { provide: LOCALE_ID, useValue: 'en-US' },
    ],
  });
  const fixture: ComponentFixture<ContactSectionComponent> =
    TestBed.createComponent(ContactSectionComponent);
  await fixture.whenStable();
  const root: HTMLElement = fixture.nativeElement;
  /**
   * Function type
   *
   * @description
   * Sets a form control value, dispatches the input event, and waits for Signal Forms to update.
   *
   * @param {string} id - Contact field element id.
   * @param {string} value - Input value to enter.
   *
   * @returns {Promise<void>} Resolves when the fixture becomes stable.
   */
  const type: (id: string, value: string) => Promise<void> = async (
    id: string,
    value: string,
  ): Promise<void> => {
    const field: HTMLInputElement | HTMLTextAreaElement | null = root.querySelector<
      HTMLInputElement | HTMLTextAreaElement
    >(`#${id}`);
    if (!field) throw new Error(`field ${id} missing`);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  /**
   * Function submit
   *
   * @description
   * Dispatches a cancelable submit event on the contact form and waits for its handler to settle.
   *
   * @returns {Promise<void>} Resolves when the fixture becomes stable.
   */
  const submit: () => Promise<void> = async (): Promise<void> => {
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };
  return {
    fixture,
    root,
    type,
    submit,
    backend: TestBed.inject<HttpTestingController>(HttpTestingController),
  };
}

describe('ContactSectionComponent', () => {
  it('lists the links passed by the shell, each with the icon of its kind', async () => {
    const { fixture, root }: Awaited<ReturnType<typeof setup>> = await setup();
    expect(root.querySelector('ul[role="list"]')).toBeNull();
    fixture.componentRef.setInput('links', [
      {
        kind: 'email',
        href: 'mailto:contact@valentin-fortin.pro',
        label: 'contact@valentin-fortin.pro',
      },
      { kind: 'malt', href: 'https://www.malt.fr/profile/x', label: 'Malt' },
    ]);
    await fixture.whenStable();
    for (const block of await fixture.getDeferBlocks())
      await block.render(DeferBlockState.Complete);
    const links: HTMLAnchorElement[] = [
      ...root.querySelectorAll<HTMLAnchorElement>('ul[role="list"] a'),
    ];
    expect(links.map((link) => [link.getAttribute('href'), link.textContent?.trim()])).toEqual([
      ['mailto:contact@valentin-fortin.pro', 'contact@valentin-fortin.pro'],
      ['https://www.malt.fr/profile/x', 'Malt'],
    ]);
    expect(links.every((link) => link.querySelector('ng-icon svg') !== null)).toBe(true);
  });

  it('refuses to send an incomplete form and flags each field', async () => {
    const { root, type, submit, backend }: Awaited<ReturnType<typeof setup>> = await setup();
    await type('contact-email', 'camille@');
    await submit();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('3 champs sont à corriger');
    const invalid: string[] = [...root.querySelectorAll('[aria-invalid="true"]')].map(
      (el) => el.id,
    );
    expect(invalid).toEqual(['contact-name', 'contact-email', 'contact-message']);
    expect(root.querySelector('#contact-email')?.getAttribute('aria-describedby')).toBe(
      'contact-email-error',
    );
    backend.expectNone('/api/contact/messages');
  });

  it('sends the message and confirms', async () => {
    const { fixture, root, type, submit, backend }: Awaited<ReturnType<typeof setup>> =
      await setup();
    await type('contact-name', 'Camille Martin');
    await type('contact-email', 'camille@exemple.fr');
    await type('contact-message', 'Bonjour, je voudrais discuter d’un projet web.');
    await submit();
    const call: TestRequest = backend.expectOne('/api/contact/messages');
    expect(call.request.body).toMatchObject({
      name: 'Camille Martin',
      subject: 'project',
      locale: 'en',
      company: null,
      website: '',
    });
    call.flush({ status: 'received' }, { status: 202, statusText: 'Accepted' });
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Merci Camille');
    expect(root.querySelector('[role="status"]')?.textContent).toContain('camille@exemple.fr');
    expect(document.activeElement?.id).toBe('contact-sent');
    expect(root.querySelector('#contact-sent > span')?.className).toContain('text-success-ink');

    [...root.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Écrire un autre message'))
      ?.click();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    expect(root.querySelector<HTMLInputElement>('#contact-name')?.value).toBe('');
    expect(document.activeElement?.id).toBe('contact-name');
  });

  it('attaches a server-returned error to the field', async () => {
    const { fixture, root, type, submit, backend }: Awaited<ReturnType<typeof setup>> =
      await setup();
    await type('contact-name', 'Camille Martin');
    await type('contact-email', 'camille@exemple.fr');
    await type('contact-message', 'Bonjour, je voudrais discuter d’un projet web.');
    await submit();
    backend
      .expectOne('/api/contact/messages')
      .flush(
        { code: 'request.invalid', errors: [{ field: 'email', message: 'Invalid' }] },
        { status: 400, statusText: 'Bad Request' },
      );
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    expect(root.querySelector('#contact-email-error')?.textContent).toContain(
      'Indiquez une adresse e-mail valide',
    );
  });

  it('shows the rate limit without a field error', async () => {
    const { fixture, root, type, submit, backend }: Awaited<ReturnType<typeof setup>> =
      await setup();
    await type('contact-name', 'Camille Martin');
    await type('contact-email', 'camille@exemple.fr');
    await type('contact-message', 'Bonjour, je voudrais discuter d’un projet web.');
    await submit();
    backend
      .expectOne('/api/contact/messages')
      .flush({ code: 'contact.rate-limited' }, { status: 429, statusText: 'Too Many Requests' });
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Trop de tentatives');
  });
});
