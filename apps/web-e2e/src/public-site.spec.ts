import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type Request } from '@playwright/test';

test.describe('public site', (): void => {
  test('the home page shows the name, the sections and the navigation', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    await page.goto('/');
    await expect(page).toHaveTitle('Valentin Fortin — Développeur web fullstack');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Valentin Fortin');
    for (const id of ['projects', 'journey', 'skills', 'about', 'contact']) {
      await expect(page.locator(`#${id}`)).toBeAttached();
    }
  });

  test('opens a project case study from the home page', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    await page.goto('/');
    await page
      .getByRole('link', { name: /IOTPlatform/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/projects\/iotplatform$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('IOTPlatform');
  });

  test('serves the English version under /en/', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/en/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle('Valentin Fortin — Full-stack web developer');
    await expect(page.getByRole('link', { name: 'See the projects' })).toBeVisible();
  });

  test('links the legal pages from the footer', async ({ page }: { page: Page }): Promise<void> => {
    await page.goto('/');
    await page.getByRole('contentinfo').getByRole('link', { name: 'Confidentialité' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Politique de confidentialité',
    );
    await page.goto('/legal-notice');
    await expect(page.getByRole('heading', { name: 'Hébergement' })).toBeVisible();
  });

  test('shows a 404 page for an unknown address', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    await page.goto('/this-page-does-not-exist');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Page introuvable');
  });

  test('the contact form flags the fields to fix without sending anything', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    const requests: string[] = [];
    page.on('request', (request: Request): void => {
      if (request.url().includes('/api/contact')) requests.push(request.url());
    });
    await page.goto('/#contact');
    const form: Locator = page.getByRole('form', { name: 'Formulaire de contact' });

    // Section hydrated on approach: the character counter reacts once the code has loaded.
    const message: Locator = form.getByLabel('Message');
    await expect(async (): Promise<void> => {
      await form.scrollIntoViewIfNeeded();
      await message.fill('Bonjour');
      await expect(form.getByText('7 / 2000')).toBeVisible({ timeout: 500 });
    }).toPass();
    await message.fill('');
    await form.getByLabel('Adresse e-mail').fill('camille@');
    await form.getByRole('button', { name: 'Envoyer le message' }).click();
    await expect(form.getByRole('alert').first()).toContainText(/champs sont à corriger/);
    await expect(form.getByLabel('Nom')).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByLabel('Message')).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByLabel('Nom')).toBeFocused();
    expect(requests).toEqual([]);
  });
});

test.describe('admin', (): void => {
  test('redirects to the login page without a session', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    await page.goto('/admin/projects');
    await expect(page).toHaveURL(/\/admin\/login\?redirect=%2Fadmin%2Fprojects$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Administration');
  });
});

test.describe('accessibility (axe)', (): void => {
  for (const path of ['/', '/projects/movah', '/en/', '/privacy', '/error/404']) {
    test(`no serious violation on ${path}`, async ({ page }: { page: Page }): Promise<void> => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const results: Awaited<ReturnType<AxeBuilder['analyze']>> = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      const serious: string[] = results.violations
        .filter(
          (v: (typeof results.violations)[number]): boolean =>
            v.impact === 'serious' || v.impact === 'critical',
        )
        .map(
          (v: (typeof results.violations)[number]): string =>
            `${v.id} (${v.nodes.length}): ${v.help}`,
        );
      expect(serious).toEqual([]);
    });
  }
});
