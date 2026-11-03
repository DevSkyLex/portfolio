import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  CollapsibleContentComponent,
  CollapsibleDirective,
  CollapsibleTriggerDirective,
} from '@internal/ui/lib/collapsible/collapsible.directive';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Provides mutable open and disabled state for the disclosure behavior fixture.
 */
@Component({
  imports: [CollapsibleDirective, CollapsibleTriggerDirective, CollapsibleContentComponent],
  template: `<div uiCollapsible [(open)]="open" [disabled]="disabled()">
    <button uiCollapsibleTrigger>Details</button>
    <ui-collapsible-content>Hidden text</ui-collapsible-content>
  </div>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property open
   * @readonly
   *
   * @description
   * Two-way-bound expanded state observed after trigger activation.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly open: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * State that prevents trigger activation in the disabled-control scenario.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly disabled: WritableSignal<boolean> = signal<boolean>(false);
  // #endregion
}

describe('Collapsible', () => {
  it('toggles the section and keeps aria-expanded in sync', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    const content: HTMLElement = fixture.nativeElement.querySelector('ui-collapsible-content');
    expect(button.getAttribute('aria-controls')).toBe(content.id);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(content.getAttribute('data-state')).toBe('closed');

    button.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(content.getAttribute('data-state')).toBe('open');
  });

  it('ignores the trigger while disabled', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });
});
