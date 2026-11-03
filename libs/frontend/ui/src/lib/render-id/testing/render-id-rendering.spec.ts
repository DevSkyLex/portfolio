import {
  type ApplicationRef,
  APP_ID,
  ChangeDetectionStrategy,
  Component,
  destroyPlatform,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  type BootstrapContext,
  bootstrapApplication,
  provideClientHydration,
} from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import { SelectComponent } from '@internal/ui/lib/select/select.component';
import { SelectOptionComponent } from '@internal/ui/lib/select/components/select-option/select-option.component';
import {
  CollapsibleContentComponent,
  CollapsibleDirective,
  CollapsibleTriggerDirective,
} from '@internal/ui/lib/collapsible/collapsible.directive';

/**
 * Component RenderHostComponent
 *
 * @description
 * Renders two disclosure relationships to exercise application-owned ids during SSR and hydration.
 */
@Component({
  selector: 'ui-id-render-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CollapsibleDirective,
    CollapsibleTriggerDirective,
    CollapsibleContentComponent,
    SelectComponent,
    SelectOptionComponent,
  ],
  template: `
    <div uiCollapsible>
      <button uiCollapsibleTrigger>First disclosure</button>
      <ui-collapsible-content>First content</ui-collapsible-content>
    </div>
    <div uiCollapsible>
      <button uiCollapsibleTrigger>Second disclosure</button>
      <ui-collapsible-content>Second content</ui-collapsible-content>
    </div>
    <ui-select ariaLabel="Generated choice"
      ><ui-select-option value="first">First choice</ui-select-option></ui-select
    >
    <ui-select triggerId="explicit-choice" ariaLabel="Explicit choice"
      ><ui-select-option value="second">Second choice</ui-select-option></ui-select
    >
  `,
})
class RenderHostComponent {}

/**
 * Function render
 *
 * @description
 * Creates and disposes an independent server application while retaining its hydration annotations.
 *
 * @returns {Promise<string>} Server HTML for one application.
 */
function render(): Promise<string> {
  destroyPlatform();
  return renderApplication(
    (context: BootstrapContext): Promise<ApplicationRef> =>
      bootstrapApplication(
        RenderHostComponent,
        {
          providers: [
            provideServerRendering(),
            { provide: APP_ID, useValue: 'ui-id-test' },
            provideZonelessChangeDetection(),
            provideClientHydration(),
          ],
        },
        context,
      ),
    {
      document:
        '<!doctype html><html><head></head><body><ui-id-render-host></ui-id-render-host></body></html>',
      url: 'http://localhost/',
      allowedHosts: ['localhost'],
    },
  );
}

describe('RenderIdService application rendering', (): void => {
  it('starts independent server renders at the same ids and preserves each control relationship', async (): Promise<void> => {
    const first: string = await render();
    const second: string = await render();
    const ids = (html: string): string[] =>
      [...html.matchAll(/id="(ui-collapsible-\d+)"/g)].map(
        (match: RegExpExecArray): string => match[1] ?? '',
      );
    expect(ids(first)).toEqual(['ui-collapsible-0', 'ui-collapsible-1']);
    expect(ids(second)).toEqual(ids(first));
    expect(first).toContain('aria-controls="ui-collapsible-0"');
    expect(first).toContain('aria-controls="ui-collapsible-1"');
    expect(first).toContain('id="ui-select-0"');
    expect(second).toContain('id="ui-select-0"');
    expect(first).toContain('id="explicit-choice"');
  });

  it('reuses server nodes and their aria relationships when the fresh browser app hydrates', async (): Promise<void> => {
    const html: string = await render();
    expect(html).toContain('ui-id-test-state');
    document.documentElement.innerHTML = new DOMParser().parseFromString(
      html,
      'text/html',
    ).documentElement.innerHTML;
    const serverContent: HTMLElement | null = document.getElementById('ui-collapsible-0');
    const app: ApplicationRef = await bootstrapApplication(RenderHostComponent, {
      providers: [
        { provide: APP_ID, useValue: 'ui-id-test' },
        provideZonelessChangeDetection(),
        provideClientHydration(),
      ],
    });
    try {
      await app.whenStable();
      expect(document.getElementById('ui-collapsible-0')).toBe(serverContent);
      const trigger: HTMLButtonElement | null = document.querySelector<HTMLButtonElement>('button');
      expect(trigger?.getAttribute('aria-controls')).toBe(serverContent?.id);
      trigger?.click();
      await app.whenStable();
      expect(trigger?.getAttribute('aria-expanded')).toBe('true');
      expect(document.getElementById('explicit-choice')).not.toBeNull();
    } finally {
      app.destroy();
      document.body.innerHTML = '';
    }
  });
});
