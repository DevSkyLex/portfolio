import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContactFormComponent } from '@internal/contact-web-feature/lib/ui/forms/contact-form/contact-form.component';
import type { ContactFormValues } from '@internal/contact-web-feature/lib/ui/forms/contact-form/models/contact-form-values.model';

/**
 * Function setup
 *
 * @description
 * Renders the contact form alone and returns its fixture, root, emitted values and field helpers.
 *
 * @returns Fixture, DOM root, emitted values and typing and submission helpers.
 */
async function setup(): Promise<{
  fixture: ComponentFixture<ContactFormComponent>;
  root: HTMLElement;
  emitted: ContactFormValues[];
  type: (id: string, value: string) => Promise<void>;
  submit: () => Promise<void>;
  fill: () => Promise<void>;
}> {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture: ComponentFixture<ContactFormComponent> =
    TestBed.createComponent(ContactFormComponent);
  const emitted: ContactFormValues[] = [];
  fixture.componentInstance.submitted.subscribe((values) => emitted.push(values));
  await fixture.whenStable();
  const root: HTMLElement = fixture.nativeElement;
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
  const submit: () => Promise<void> = async (): Promise<void> => {
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };
  const fill: () => Promise<void> = async (): Promise<void> => {
    await type('contact-name', 'Camille Martin');
    await type('contact-email', 'camille@exemple.fr');
    await type('contact-message', 'Bonjour, je voudrais discuter d’un projet web.');
  };
  return { fixture, root, emitted, type, submit, fill };
}

describe('ContactFormComponent', () => {
  it('emits the valid values, honeypot included, without the locale', async () => {
    const { root, emitted, submit, fill }: Awaited<ReturnType<typeof setup>> = await setup();
    await fill();
    await submit();
    expect(emitted).toEqual([
      {
        name: 'Camille Martin',
        company: '',
        email: 'camille@exemple.fr',
        subject: 'project',
        message: 'Bonjour, je voudrais discuter d’un projet web.',
        website: '',
      },
    ]);
    expect(root.querySelector('[data-slot="alert"]')).toBeNull();
  });

  it('flags one field in a danger alert and counts the message length', async () => {
    const { root, emitted, type, submit, fill }: Awaited<ReturnType<typeof setup>> = await setup();
    await fill();
    await type('contact-company', 'x'.repeat(121));
    await submit();
    expect(emitted).toEqual([]);
    const alert: Element | null = root.querySelector('[data-slot="alert"]');
    expect(alert?.getAttribute('data-variant')).toBe('danger');
    expect(alert?.textContent).toContain('Un champ est à corriger ci-dessous.');
    expect(root.querySelector('#contact-company-error')?.textContent).toContain(
      "Le nom de l'entreprise est trop long.",
    );
    expect(root.textContent).toContain(
      `${'Bonjour, je voudrais discuter d’un projet web.'.length} / 2000`,
    );
  });

  it('holds back the error of a field blurred by a press until the pointer is released', async () => {
    const { fixture, root, type }: Awaited<ReturnType<typeof setup>> = await setup();
    await type('contact-email', 'camille@');
    root
      .querySelector('button[type="submit"]')
      ?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    root.querySelector('#contact-email')?.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(root.querySelector('#contact-email-error')).toBeNull();
    expect(root.querySelector('[data-slot="alert"]')).toBeNull();
    document.dispatchEvent(new Event('pointerup'));
    await fixture.whenStable();
    expect(root.querySelector('#contact-email')?.getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('[data-slot="alert"]')?.textContent).toContain(
      'Un champ est à corriger ci-dessous.',
    );
  });

  it('keeps a server error on its field until the value changes', async () => {
    const { fixture, root, type, submit, fill }: Awaited<ReturnType<typeof setup>> = await setup();
    await fill();
    await submit();
    fixture.componentRef.setInput('serverErrors', [
      { field: 'email', message: 'Invalid' },
      { field: 'unknown', message: 'Ignored' },
    ]);
    await fixture.whenStable();
    expect(root.querySelector('#contact-email')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement?.id).toBe('contact-email');
    await type('contact-email', 'camille@exemple.com');
    expect(root.querySelector('#contact-email')?.getAttribute('aria-invalid')).toBeNull();
  });

  it('shows a whole-request failure and the pending state', async () => {
    const { fixture, root }: Awaited<ReturnType<typeof setup>> = await setup();
    fixture.componentRef.setInput('failure', 'Trop de tentatives.');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    expect(root.querySelector('[data-slot="alert"]')?.textContent).toContain('Trop de tentatives.');
    const button: HTMLButtonElement | null =
      root.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute('aria-busy')).toBe('true');
    expect(button?.textContent).toContain('Envoi en cours');
  });
});
