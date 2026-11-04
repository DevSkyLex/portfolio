import { provideHttpClient } from '@angular/common/http';
import {
  type TestRequest,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { AuthorizationConsent } from '@vfortin/identity-web-data-access';
import type { Mock } from 'vitest';
import { IDENTITY_OAUTH_ROUTES } from '@internal/identity-web-feature/lib/identity-oauth.routes';
import { ExternalNavigationService } from '@internal/identity-web-feature/lib/services/external-navigation/external-navigation.service';

/**
 * Constant CONSENT
 *
 * @description
 * Consent answer of a metadata-document client.
 */
const CONSENT: AuthorizationConsent = {
  status: 'consent',
  requestId: 'r1',
  expiresIn: 600,
  client: {
    clientId: 'https://claude.ai/oauth/mcp-oauth-client-metadata',
    name: 'Claude',
    clientUri: 'https://claude.ai',
    logo: 'data:image/png;base64,AA==',
    registration: 'metadata-document',
  },
  redirectUri: 'https://claude.ai/api/mcp/auth_callback',
  redirectHost: 'claude.ai',
  loopbackRedirect: false,
  scopes: ['content:read', 'content:write'],
  grantedScopes: [],
  resource: 'https://valentin-fortin.pro/api/content/mcp',
};

/**
 * Constant QUERY
 *
 * @description
 * Authorization query as an MCP client builds it (form-encoded, `+` for spaces).
 */
const QUERY: string =
  'response_type=code&client_id=https%3A%2F%2Fclaude.ai%2Foauth%2Fmcp-oauth-client-metadata' +
  '&redirect_uri=https%3A%2F%2Fclaude.ai%2Fapi%2Fmcp%2Fauth_callback&scope=content%3Aread+content%3Awrite' +
  '&state=s1&code_challenge=abc&code_challenge_method=S256' +
  '&resource=https%3A%2F%2Fvalentin-fortin.pro%2Fapi%2Fcontent%2Fmcp&prompt=consent';

/**
 * Function flush
 *
 * @description
 * Lets promise continuations and change detection settle.
 *
 * @returns {Promise<unknown>} Resolves on the next timer turn.
 */
const flush: () => Promise<unknown> = (): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve));

/**
 * Interface Page
 * @interface Page
 *
 * @description
 * Rendered consent page with its backend and navigation double.
 */
interface Page {
  readonly harness: RouterTestingHarness;
  readonly backend: HttpTestingController;
  readonly assign: Mock<(url: string) => void>;
  readonly root: () => HTMLElement;
}

/**
 * Function open
 *
 * @description
 * Opens the consent page on a query and returns it before the review answers.
 *
 * @param {string} query - Query string.
 *
 * @returns {Promise<Page>} Page.
 */
async function open(query: string = QUERY): Promise<Page> {
  const assign: Mock<(url: string) => void> = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: 'admin/oauth/authorize', children: IDENTITY_OAUTH_ROUTES }]),
      { provide: ExternalNavigationService, useValue: { assign } },
    ],
  });
  const harness: RouterTestingHarness = await RouterTestingHarness.create();
  await harness.navigateByUrl(`/admin/oauth/authorize?${query}`);
  return {
    harness,
    backend: TestBed.inject<HttpTestingController>(HttpTestingController),
    assign,
    root: (): HTMLElement => harness.routeNativeElement as HTMLElement,
  };
}

/**
 * Function settle
 *
 * @description
 * Lets an answer reach the page.
 *
 * @param {RouterTestingHarness} harness - Router harness.
 *
 * @returns {Promise<void>} Resolves once rendered.
 */
async function settle(harness: RouterTestingHarness): Promise<void> {
  await flush();
  await harness.fixture.whenStable();
  harness.detectChanges();
}

/**
 * Function click
 *
 * @description
 * Clicks a button by its text.
 *
 * @param {HTMLElement} root - Page root.
 * @param {string} text - Visible text.
 */
function click(root: HTMLElement, text: string): void {
  const target: HTMLButtonElement | undefined = [...root.querySelectorAll('button')].find(
    (button: HTMLButtonElement): boolean => button.textContent?.trim() === text,
  );
  if (!target) throw new Error(text);
  target.click();
}

/**
 * Function text
 *
 * @description
 * Whitespace-normalized text of the page.
 *
 * @param {HTMLElement} root - Page root.
 *
 * @returns {string} Text.
 */
function text(root: HTMLElement): string {
  return (root.textContent ?? '').replace(/\s+/g, ' ');
}

describe('OAuthConsentPageComponent', () => {
  afterEach(() => TestBed.inject<HttpTestingController>(HttpTestingController).verify());

  it('forwards the authorization query and shows who asks for what', async () => {
    const { harness, backend, root }: Page = await open(`${QUERY}&state=s2`);
    expect(document.title).toBe('Autoriser une application — Administration');
    expect(root().querySelector('[role="status"]')?.textContent).toContain(
      'Vérification de la demande…',
    );
    const call: TestRequest = backend.expectOne('/api/auth/admin/oauth/authorizations');
    expect(call.request.body).toEqual({
      response_type: 'code',
      client_id: 'https://claude.ai/oauth/mcp-oauth-client-metadata',
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      scope: 'content:read content:write',
      state: ['s1', 's2'],
      code_challenge: 'abc',
      code_challenge_method: 'S256',
      resource: 'https://valentin-fortin.pro/api/content/mcp',
    });
    call.flush(CONSENT);
    await settle(harness);
    expect(root().querySelector('h1')?.textContent?.trim()).toBe('Autoriser Claude ?');
    expect(root().querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AA==');
    const page: string = text(root());
    expect([...root().querySelectorAll('dt')].map((dt) => dt.textContent?.trim())).toEqual([
      'Application',
      'Retour vers',
      'Site',
    ]);
    expect([...root().querySelectorAll('dd span')].map((span) => span.textContent?.trim())).toEqual(
      ['claude.ai', 'https://claude.ai/oauth/mcp-oauth-client-metadata'],
    );
    expect([...root().querySelectorAll('dd')].slice(1).map((dd) => dd.textContent?.trim())).toEqual(
      ['claude.ai', 'valentin-fortin.pro/api/content/mcp'],
    );
    expect([...root().querySelectorAll('li h3')].map((h) => h.textContent?.trim())).toEqual([
      'Lire le contenu',
      'Modifier le contenu',
    ]);
    expect(page).toContain(
      'Les messages reçus par le formulaire de contact ne sont jamais accessibles.',
    );
    expect(root().querySelector('[data-slot="alert"]')).toBeNull();
    expect(root().querySelector('[data-slot="badge"]')).toBeNull();
  });

  it('warns about an unverified client, a loopback redirect, and marks new scopes', async () => {
    const { harness, backend, root }: Page = await open();
    backend.expectOne('/api/auth/admin/oauth/authorizations').flush({
      ...CONSENT,
      client: {
        ...CONSENT.client,
        name: null,
        logo: null,
        registration: 'dynamic',
        clientId: 'd1',
      },
      redirectHost: '127.0.0.1:5173',
      loopbackRedirect: true,
      grantedScopes: ['content:read'],
    });
    await settle(harness);
    expect(root().querySelector('h1')?.textContent?.trim()).toBe('Autoriser Cette application ?');
    expect(
      [...root().querySelectorAll('[data-slot="alert"] [data-slot="alert-title"]')].map((t) =>
        t.textContent?.trim(),
      ),
    ).toEqual(['Application non vérifiée', 'Retour vers cet ordinateur']);
    expect(text(root().querySelector('dd') as HTMLElement)).toContain('Enregistrée dynamiquement');
    expect(
      [...root().querySelectorAll('[data-slot="badge"]')].map((b) => b.textContent?.trim()),
    ).toEqual(['Nouveau']);
  });

  it('approves and sends the browser back with the code', async () => {
    const { harness, backend, assign, root }: Page = await open();
    backend.expectOne('/api/auth/admin/oauth/authorizations').flush(CONSENT);
    await settle(harness);
    click(root(), 'Autoriser');
    const approve: TestRequest = backend.expectOne(
      '/api/auth/admin/oauth/authorizations/r1/approve',
    );
    expect(approve.request.method).toBe('POST');
    approve.flush({
      status: 'redirect',
      redirectTo: 'https://claude.ai/api/mcp/auth_callback?code=c&state=s1&iss=x',
    });
    await settle(harness);
    expect(assign).toHaveBeenCalledWith(
      'https://claude.ai/api/mcp/auth_callback?code=c&state=s1&iss=x',
    );
    expect(root().querySelector('[role="status"]')?.textContent?.replace(/\s+/g, ' ')).toContain(
      'Redirection vers claude.ai…',
    );
  });

  it('refuses and sends the browser back with the denial', async () => {
    const { harness, backend, assign, root }: Page = await open();
    backend.expectOne('/api/auth/admin/oauth/authorizations').flush(CONSENT);
    await settle(harness);
    click(root(), 'Refuser');
    backend
      .expectOne('/api/auth/admin/oauth/authorizations/r1/deny')
      .flush({ status: 'redirect', redirectTo: 'http://127.0.0.1:9/cb?error=access_denied' });
    await settle(harness);
    expect(assign).toHaveBeenCalledWith('http://127.0.0.1:9/cb?error=access_denied');
  });

  it('follows an error redirect of the review at once', async () => {
    const { harness, backend, assign }: Page = await open();
    backend
      .expectOne('/api/auth/admin/oauth/authorizations')
      .flush({ status: 'redirect', redirectTo: 'https://claude.ai/cb?error=invalid_scope' });
    await settle(harness);
    expect(assign).toHaveBeenCalledWith('https://claude.ai/cb?error=invalid_scope');
  });

  it('explains a request that cannot go back to the client', async () => {
    const { harness, backend, assign, root }: Page = await open();
    backend
      .expectOne('/api/auth/admin/oauth/authorizations')
      .flush(
        { status: 400, code: 'identity.oauth-invalid-redirect-uri', title: 'x' },
        { status: 400, statusText: 'Bad Request' },
      );
    await settle(harness);
    expect(root().querySelector('h1')?.textContent?.trim()).toBe('Autorisation impossible');
    expect(text(root())).toContain(
      'L’adresse de retour demandée n’est pas déclarée par cette application. Aucune redirection n’a été faite.',
    );
    expect(root().querySelector('a')?.getAttribute('href')).toBe('/admin');
    expect(assign).not.toHaveBeenCalled();
  });

  it('disables the decision once the request expired', async () => {
    const { harness, backend, assign, root }: Page = await open();
    backend.expectOne('/api/auth/admin/oauth/authorizations').flush(CONSENT);
    await settle(harness);
    click(root(), 'Autoriser');
    backend
      .expectOne('/api/auth/admin/oauth/authorizations/r1/approve')
      .flush(
        { status: 404, code: 'identity.oauth-request-expired', title: 'x' },
        { status: 404, statusText: 'Not Found' },
      );
    await settle(harness);
    expect(text(root())).toContain('Cette demande a expiré ou a déjà été traitée.');
    expect(
      [...root().querySelectorAll('button')].every(
        (button: HTMLButtonElement): boolean => button.disabled,
      ),
    ).toBe(true);
    expect(assign).not.toHaveBeenCalled();
  });

  it('never follows a redirect that is neither https nor loopback', async () => {
    const { harness, backend, assign, root }: Page = await open();
    backend
      .expectOne('/api/auth/admin/oauth/authorizations')
      .flush({ status: 'redirect', redirectTo: 'http://evil.exemple/cb?error=x' });
    await settle(harness);
    expect(assign).not.toHaveBeenCalled();
    expect(text(root())).toContain('Redirection refusée');
  });
});
