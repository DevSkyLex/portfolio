import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LEGAL_ROUTES } from '@internal/legal-web-feature/lib/legal.routes';

describe('legal pages', (): void => {
  beforeEach((): void => {
    TestBed.configureTestingModule({ providers: [provideRouter(LEGAL_ROUTES)] });
  });

  it('present the publisher, the host and the link to the privacy policy', async (): Promise<void> => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/legal-notice');
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent).toBe('Mentions légales');
    expect(root.textContent).toContain('OVH SAS');
    expect(root.querySelector('a[href="/privacy"]')).not.toBeNull();
  });

  it('describe data retention and the rights of individuals', async (): Promise<void> => {
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/privacy');
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('trois ans après leur réception');
    expect(root.querySelector('a[href="mailto:contact@valentin-fortin.pro"]')).not.toBeNull();
  });
});
