import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { TechTagsComponent } from '@internal/content-web-ui/lib/tech/components/tech-tags/tech-tags.component';

/**
 * Function render
 *
 * @description
 * Renders the tags with the given technologies and limit.
 *
 * @param {readonly string[]} techs - Technology keys.
 * @param {number | null} limit - Most pills shown.
 *
 * @returns {Promise<HTMLElement>} Rendered host.
 */
async function render(techs: readonly string[], limit: number | null): Promise<HTMLElement> {
  const fixture: ComponentFixture<TechTagsComponent> = TestBed.createComponent(TechTagsComponent);
  fixture.componentRef.setInput('techs', techs);
  fixture.componentRef.setInput('limit', limit);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('TechTagsComponent', (): void => {
  it('shows every technology without a limit', async (): Promise<void> => {
    const root: HTMLElement = await render(['angular', 'typescript', 'css', 'html'], null);
    expect(root.querySelectorAll('li')).toHaveLength(4);
    expect(root.textContent).not.toContain('+');
  });

  it('shows the first ones and a « +N » pill naming the rest for assistive technologies', async (): Promise<void> => {
    const root: HTMLElement = await render(['angular', 'typescript', 'css', 'html', 'docker'], 3);
    const items: HTMLLIElement[] = [...root.querySelectorAll<HTMLLIElement>('li')];
    expect(items).toHaveLength(4);
    const more: HTMLLIElement | undefined = items.at(-1);
    expect(more?.querySelector('[aria-hidden="true"]')?.textContent?.trim()).toBe('+2');
    expect(more?.querySelector('.sr-only')?.textContent?.trim()).toMatch(/^et 2 autres : .+, .+$/);
  });

  it('adds no pill when the technologies fit the limit', async (): Promise<void> => {
    const root: HTMLElement = await render(['angular', 'typescript', 'css'], 3);
    expect(root.querySelectorAll('li')).toHaveLength(3);
    expect(root.querySelector('.sr-only')).toBeNull();
  });
});
