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
      .getByRole('link', { name: /Carnet d’accessibilité/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/projects\/accessibility-notebook$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Carnet d’accessibilité');
  });

  test('lists the level-2 headings of a case study in its contents and reaches them by fragment', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    // The contents column needs a 1024 px page; the mobile project would hide it.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/projects/library-trails');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Parcours de lecture');
    const sections: { id: string; title: string }[] = await page
      .locator('article > section')
      .evaluateAll((elements: Element[]): { id: string; title: string }[] =>
        elements.map((section: Element): { id: string; title: string } => ({
          id: section.id,
          title: section.querySelector(':scope > h2')?.textContent?.trim() ?? '',
        })),
      );
    expect(sections.length).toBeGreaterThan(1);
    const contents: Locator = page.getByRole('navigation', { name: 'Sommaire' }).getByRole('link');
    const entries: { href: string | null; label: string }[] = await contents.evaluateAll(
      (links: Element[]): { href: string | null; label: string }[] =>
        links.map((link: Element): { href: string | null; label: string } => ({
          href: link.getAttribute('href'),
          label: link.textContent?.trim() ?? '',
        })),
    );
    expect(entries).toEqual(
      sections.map(
        (section: { id: string; title: string }): { href: string | null; label: string } => ({
          href: `/fr/projects/library-trails#${section.id}`,
          label: section.title,
        }),
      ),
    );
    await expect(contents.first()).toHaveAttribute('aria-current', 'true');

    const first: { id: string; title: string } = sections[0] as { id: string; title: string };
    const last: { id: string; title: string } = sections.at(-1) as { id: string; title: string };
    const lastSection: Locator = page.getByRole('region', { name: last.title, exact: true });
    const banner: Locator = page.getByRole('banner');
    const article: Locator = page.getByRole('article');
    await expect(article).toHaveCSS('row-gap', '56px');
    // The link answers once the page is hydrated.
    await expect(async (): Promise<void> => {
      await contents.last().click();
      await expect(page).toHaveURL(new RegExp(`#${last.id}$`), { timeout: 1_000 });
    }).toPass();
    await expect(contents.last()).toHaveAttribute('aria-current', 'true');
    await expect(lastSection).toBeFocused();
    const headerBottom: number = await banner.evaluate(
      (element: HTMLElement): number => element.getBoundingClientRect().bottom,
    );
    await expect
      .poll((): Promise<number> =>
        lastSection.evaluate((element: HTMLElement): number => element.getBoundingClientRect().top),
      )
      .toBeGreaterThan(headerBottom);
    await expect(page.getByRole('heading', { level: 2, name: last.title })).toBeInViewport();

    await contents.first().press('Enter');
    await expect(page).toHaveURL(new RegExp(`#${first.id}$`));
    await expect(contents.first()).toHaveAttribute('aria-current', 'true');
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`#${last.id}$`));
    await expect(contents.last()).toHaveAttribute('aria-current', 'true');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('about:blank');
    await page.goto(`/fr/projects/library-trails#${first.id}`);
    await expect(article).toHaveCSS('row-gap', '40px');
    const mobileHeaderBottom: number = await banner.evaluate(
      (element: HTMLElement): number => element.getBoundingClientRect().bottom,
    );
    await expect
      .poll((): Promise<number> =>
        page
          .getByRole('region', { name: first.title, exact: true })
          .evaluate((element: HTMLElement): number => element.getBoundingClientRect().top),
      )
      .toBeGreaterThan(mobileHeaderBottom);
    await expect(page.getByRole('heading', { level: 2, name: first.title })).toBeInViewport();
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
    await expect(page.getByText('Dernière mise à jour : 15 janvier 2025')).toBeVisible();
    await page.goto('/legal-notice');
    await expect(page.getByRole('heading', { name: 'Hébergement' })).toBeVisible();
    // The documents are content (D44): each heading labels its section.
    await expect(page.getByRole('region', { name: 'Hébergement' })).toContainText(
      'Hébergement Démo',
    );
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
      await page.locator('#contact').scrollIntoViewIfNeeded();
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
  for (const path of ['/', '/projects/library-trails', '/en/', '/privacy', '/error/404']) {
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
