import AxeBuilder from '@axe-core/playwright';
import {
  expect,
  test,
  type Page,
  type APIResponse,
  type Locator,
  type Response,
  type Route,
} from '@playwright/test';
import { stackTotp } from '@internal/web-e2e/support/stack';

/**
 * Interface StackProjectSummary
 *
 * @description
 * Seeded project fields used by browser acceptance to select editor targets.
 */
interface StackProjectSummary {
  id: string;
  title: { fr: string };
  version: number;
}

// Authentication request bodies must not be persisted in browser trace artifacts.
test.use({ trace: 'off' });

/**
 * Function assertAdminAccessibility
 *
 * @description
 * Applies the public acceptance severity policy to real, authenticated administration screens.
 *
 * @param {Page} page - Stable administration screen with its normal controls present.
 * @returns {Promise<void>} Completion after checking all page elements for blocking WCAG findings.
 */
async function assertAdminAccessibility(page: Page): Promise<void> {
  const result: Awaited<ReturnType<AxeBuilder['analyze']>> = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(
    result.violations.filter(
      (violation: (typeof result.violations)[number]): boolean =>
        violation.impact === 'serious' || violation.impact === 'critical',
    ),
  ).toEqual([]);
}

test.describe('isolated stack acceptance @stack', (): void => {
  // Enrollment and content edits persist in this stack; retry by provisioning a fresh e2e-stack run.
  test.describe.configure({ retries: 0 });
  test.skip(!process.env['STACK_PASSWORD'], 'Requires the isolated e2e-stack runner.');
  test('enrolls and authenticates with TOTP, rotates cookies, protects editor revisions and delivers contact notifications', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    test.setTimeout(180_000);
    const email: string = process.env['STACK_EMAIL'] ?? '';
    const password: string = process.env['STACK_PASSWORD'] ?? '';

    // The bootstrap creates a password-only account (D17): the password alone opens a session.
    const passwordOnly: APIResponse<unknown> = await page.request.post('/api/auth/login', {
      data: { email, password, remember: false },
    });
    expect(passwordOnly.status()).toBe(200);
    const opened: { status: string; accessToken: string } = (await passwordOnly.json()) as {
      status: string;
      accessToken: string;
    };
    expect(opened.status).toBe('authenticated');
    const bearer: { authorization: string } = { authorization: `Bearer ${opened.accessToken}` };
    const before: APIResponse<unknown> = await page.request.get('/api/auth/totp', {
      headers: bearer,
    });
    expect(await before.json()).toEqual({ enabled: false });
    const setup: APIResponse<unknown> = await page.request.post('/api/auth/totp/setup', {
      headers: bearer,
      data: { password },
    });
    expect(setup.status()).toBe(200);
    expect(setup.headers()['cache-control']).toBe('no-store');
    // `stackTotp` reads the enrollment from this worker's environment; it stays in memory.
    process.env['STACK_TOTP_SECRET'] = ((await setup.json()) as { secret: string }).secret;
    const enabled: APIResponse<unknown> = await page.request.post('/api/auth/totp/enable', {
      headers: bearer,
      data: { totp: stackTotp() },
    });
    expect(enabled.status()).toBe(200);
    expect(await enabled.json()).toEqual({ enabled: true });
    const enrolledStep: number = Math.floor(Date.now() / 30_000);
    const closed: APIResponse<unknown> = await page.request.post('/api/auth/logout', {
      headers: { 'x-csrf': '1' },
    });
    expect(closed.status()).toBe(204);
    // The confirmation code is spent (replay protection): the login needs the next period's code.
    await expect
      .poll((): number => Math.floor(Date.now() / 30_000), { timeout: 35_000, intervals: [1_000] })
      .toBeGreaterThan(enrolledStep);

    await page.goto('/admin/login');
    await expect(page.getByRole('heading', { name: 'Administration', exact: true })).toBeVisible();
    await assertAdminAccessibility(page);
    await page.getByLabel('Adresse e-mail', { exact: false }).fill(email);
    await page.getByLabel('Mot de passe', { exact: false }).fill(password);
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Code de vérification' })).toBeVisible();
    const authenticated: Promise<Response> = page.waitForResponse(
      (response: Response): boolean =>
        response.url().endsWith('/api/auth/login/totp') && response.request().method() === 'POST',
    );
    await page.getByRole('textbox', { name: 'Code à six chiffres' }).fill(stackTotp());
    const login: Response = await authenticated;
    expect(login.status()).toBe(200);
    // The administration lands on the « Tableau de bord » (D47).
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Tableau de bord', exact: true })).toBeVisible();
    await assertAdminAccessibility(page);
    await page.goto('/admin/projects');
    await expect(page.getByRole('heading', { name: /^Projets(?:\s|$)/ })).toBeVisible();
    await assertAdminAccessibility(page);
    const session: APIResponse<unknown> = await page.request.post('/api/auth/refresh', {
      headers: { 'x-csrf': '1' },
    });
    expect(session.status()).toBe(200);
    const token: string = ((await session.json()) as { accessToken: string }).accessToken;
    const headers: { authorization: string; 'x-csrf': string } = {
      authorization: `Bearer ${token}`,
      'x-csrf': '1',
    };
    const redirect: APIResponse<unknown> = await page.request.get('/api/content/admin/projects', {
      headers,
      maxRedirects: 0,
    });
    expect(redirect.status()).toBe(301);
    expect(redirect.headers()['location']).toBe('/api/content/admin/projects/');
    const listed: APIResponse<unknown> = await page.request.get('/api/content/admin/projects', {
      headers,
    });
    expect(listed.status()).toBe(200);
    const projects: StackProjectSummary[] = (
      (await listed.json()) as {
        member: StackProjectSummary[];
      }
    ).member;
    const first: StackProjectSummary | undefined = projects[0];
    const second: StackProjectSummary | undefined = projects[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) throw new Error('Seed must provide two projects.');
    await page.goto(`/admin/projects/${first.id}`);
    await expect(page.getByRole('heading', { name: first.title.fr, exact: true })).toBeVisible();
    await page.keyboard.press('ControlOrMeta+k');
    await page.getByRole('option', { name: second.title.fr, exact: false }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/projects/${second.id}$`));
    await expect(page.getByRole('heading', { name: second.title.fr, exact: true })).toBeVisible();

    const titleField: Locator = page.getByRole('textbox', {
      name: 'Titre en français',
      exact: true,
    });
    await titleField.fill(`${second.title.fr} draft`);
    await page.getByRole('link', { name: 'Tous les projets', exact: true }).click();
    const discard: Locator = page.getByRole('alertdialog', { name: 'Quitter sans enregistrer ?' });
    await expect(discard).toBeVisible();
    await discard.getByRole('button', { name: 'Continuer la modification', exact: true }).click();
    await expect(titleField).toHaveValue(`${second.title.fr} draft`);
    await page.getByRole('link', { name: 'Tous les projets', exact: true }).click();
    await discard.getByRole('button', { name: 'Quitter', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/projects$/);

    await page.goto(`/admin/projects/${first.id}`);
    const editorTitle: Locator = page.getByRole('textbox', {
      name: 'Titre en français',
      exact: true,
    });
    await expect(editorTitle).toHaveValue(first.title.fr);
    await assertAdminAccessibility(page);
    const siteUrl: Locator = page.getByRole('textbox', { name: 'Site', exact: true });
    const initialUrl: string = await siteUrl.inputValue();
    await siteUrl.fill('http://invalid.example');
    await page.getByRole('button', { name: 'Enregistrer', exact: false }).click();
    await expect(page.getByText('Utilisez une URL HTTPS valide.', { exact: true })).toBeVisible();
    await siteUrl.fill(initialUrl);
    const updatedTitle: string = `${first.title.fr} acceptance`;
    await editorTitle.fill(updatedTitle);
    const uiSave: Promise<Response> = page.waitForResponse(
      (response: Response): boolean =>
        response.url().endsWith(`/api/content/admin/projects/${first.id}`) &&
        response.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Enregistrer', exact: false }).click();
    expect((await uiSave).status()).toBe(200);
    await expect(page.getByRole('heading', { name: updatedTitle, exact: true })).toBeVisible();
    await expect(page.getByText('Tout est enregistré', { exact: true })).toBeVisible();

    const current: APIResponse<unknown> = await page.request.get(
      `/api/content/admin/projects/${first.id}`,
      { headers },
    );
    const project: Record<string, unknown> = (await current.json()) as Record<string, unknown>;
    const fields: string[] = [
      'title',
      'summary',
      'lead',
      'period',
      'client',
      'role',
      'place',
      'siteUrl',
      'techs',
      'featured',
      'article',
      'cover',
      'seo',
    ];
    const revision: Record<string, unknown> = Object.fromEntries(
      fields.map((field: string): [string, unknown] => [field, project[field]]),
    );
    const version: string = String(project['version']);
    const externalTitle: string = `${first.title.fr} external revision`;
    const saved: APIResponse<unknown> = await page.request.put(
      `/api/content/admin/projects/${first.id}`,
      {
        headers: { ...headers, 'if-match': `"${version}"` },
        data: { ...revision, title: { ...(project['title'] as object), fr: externalTitle } },
      },
    );
    expect(saved.status()).toBe(200);
    await editorTitle.fill(`${first.title.fr} stale draft`);
    const staleSave: Promise<Response> = page.waitForResponse(
      (response: Response): boolean =>
        response.url().endsWith(`/api/content/admin/projects/${first.id}`) &&
        response.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Enregistrer', exact: false }).click();
    expect((await staleSave).status()).toBe(412);
    await expect(
      page.getByText('Le projet a été modifié ailleurs depuis son ouverture.', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Recharger', exact: true }).click();
    await expect(editorTitle).toHaveValue(externalTitle);
    await page.getByRole('button', { name: 'Dépublier', exact: true }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Dépublier', exact: true })
      .click();
    await expect(page.getByText('Retiré du site public.', { exact: true })).toBeVisible();
    const publication: Promise<Response> = page.waitForResponse((response: Response): boolean =>
      response.url().endsWith(`/api/content/admin/projects/${first.id}/publish`),
    );
    await page.getByRole('button', { name: 'Publier', exact: true }).click();
    expect((await publication).status()).toBe(200);
    const publishedNotice: Locator = page.getByRole('status').filter({ hasText: 'Publié.' });
    await expect(publishedNotice).toBeVisible();
    await expect(publishedNotice).toContainText(
      'Le site sera mis à jour automatiquement après les modifications.',
    );

    const content: string = `Acceptance message ${Date.now()}: please verify delivery to the local inbox.`;
    await page.goto('/#contact');
    // The contact section is deferred until its placeholder approaches the viewport.
    await expect(async (): Promise<void> => {
      await page.locator('#contact').scrollIntoViewIfNeeded();
      await expect(page.getByRole('form', { name: 'Formulaire de contact' })).toBeVisible();
    }).toPass();
    const contact: Locator = page.getByRole('form', { name: 'Formulaire de contact' });
    await contact.getByRole('textbox', { name: 'Nom', exact: false }).fill('Acceptance sender');
    await contact
      .getByRole('textbox', { name: 'Adresse e-mail', exact: false })
      .fill('sender@example.test');
    await contact.getByRole('textbox', { name: 'Message', exact: false }).fill(content);
    const sent: Promise<Response> = page.waitForResponse(
      (response: Response): boolean =>
        response.url().endsWith('/api/contact/messages') && response.request().method() === 'POST',
    );
    await contact.getByRole('button', { name: 'Envoyer le message', exact: true }).click();
    expect((await sent).status()).toBe(202);
    await expect(page.getByRole('heading', { name: 'Message envoyé', exact: true })).toBeVisible();
    await expect
      .poll(
        async (): Promise<number> => {
          const mail: APIResponse<unknown> = await page.request.get(
            `${process.env['MAILPIT_URL']}/api/v1/messages`,
          );
          return ((await mail.json()) as { total: number }).total;
        },
        { timeout: 30_000 },
      )
      .toBeGreaterThan(0);
    await page.goto('/admin/messages');
    await expect(page.getByRole('heading', { name: /^Messages(?:\s|$)/ })).toBeVisible();
    const messageLink: Locator = page
      .getByRole('navigation', { name: 'Administration', exact: true })
      .getByRole('link', { name: /Messages/ });
    await expect(messageLink).toContainText('1');
    // « Tous » is the default tab; a message shown for a second is marked read on its own.
    await expect(page.getByRole('tab', { name: 'Tous', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const read: Promise<Response> = page.waitForResponse(
      (response: Response): boolean =>
        response.url().endsWith('/read') && response.request().method() === 'POST',
    );
    await page
      .getByRole('list', { name: 'Tous les messages' })
      .getByRole('button', { name: /Acceptance sender/ })
      .click();
    const detail: Locator = page.getByRole('article', {
      name: 'Message de Acceptance sender',
      exact: true,
    });
    await expect(detail.getByText(content, { exact: true })).toBeVisible();
    await assertAdminAccessibility(page);
    expect((await read).status()).toBe(200);
    await expect(detail.getByRole('button', { name: 'Marquer comme lu' })).toHaveCount(0);
    await expect(messageLink).toHaveText('Messages');
    const archived: Promise<Response> = page.waitForResponse(
      (response: Response): boolean =>
        response.url().endsWith('/archive') && response.request().method() === 'POST',
    );
    await detail.getByRole('button', { name: 'Archiver', exact: true }).click();
    expect((await archived).status()).toBe(200);
    await page.getByRole('tab', { name: 'Archivés', exact: true }).click();
    await expect(
      page
        .getByRole('list', { name: 'Messages archivés' })
        .getByRole('button', { name: /Acceptance sender/ }),
    ).toBeVisible();
    await page.route('**/api/auth/logout', (route: Route): Promise<void> => route.abort('failed'));
    await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
    await expect(
      page.getByText('La déconnexion n’a pas été confirmée. Réessayez.', { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/messages\?status=archived$/);
    await page.unroute('**/api/auth/logout');
    await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    const revoked: APIResponse<unknown> = await page.request.post('/api/auth/refresh', {
      headers: { 'x-csrf': '1' },
    });
    expect(revoked.status()).toBe(401);
  });
});
