import { expect, type Page, type Locator } from '@playwright/test';

/**
 * Function chooseFooterOption
 *
 * @description
 * Opens the named footer listbox and selects an option after Angular event replay has made the trigger interactive.
 * The expanded state is awaited as the hydration readiness signal.
 *
 * @param {Page} page - Browser page containing the footer.
 * @param {string} label - Accessible name of the footer menu.
 * @param {string} option - Accessible name of the option to select.
 * @returns {Promise<void>} Completion after the selected option is clicked.
 */
export async function chooseFooterOption(page: Page, label: string, option: string): Promise<void> {
  const trigger: Locator = page
    .getByRole('contentinfo')
    .getByRole('button', { name: new RegExp(`^${label}`) });
  await expect(async (): Promise<void> => {
    await trigger.scrollIntoViewIfNeeded();
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true', { timeout: 1_000 });
  }).toPass();
  await page.getByRole('listbox', { name: label }).getByRole('option', { name: option }).click();
}

/**
 * Function endlessAnimations
 *
 * @description
 * Returns names or identifiers of page animations that are currently running with infinite iterations.
 *
 * @param {Page} page - Browser page to inspect.
 * @returns {Promise<string[]>} Identifiers for animations that will not finish naturally.
 */
export function endlessAnimations(page: Page): Promise<string[]> {
  return page.evaluate((): string[] =>
    document
      .getAnimations()
      .filter(
        (animation: Animation): boolean =>
          animation.playState === 'running' &&
          animation.effect?.getTiming().iterations === Infinity,
      )
      .map((animation: Animation): string =>
        'animationName' in animation
          ? String(animation.animationName)
          : animation.id || 'animation',
      ),
  );
}
