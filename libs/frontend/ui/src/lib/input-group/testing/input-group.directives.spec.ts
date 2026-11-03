import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  InputGroupAddonDirective,
  InputGroupButtonDirective,
  InputGroupDirective,
  InputGroupInputDirective,
  InputGroupTextDirective,
} from '@internal/ui/lib/input-group/input-group.directives';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Supplies a small amount group with a native input, text addon and compact button for directive integration cases.
 */
@Component({
  imports: [
    InputGroupDirective,
    InputGroupAddonDirective,
    InputGroupButtonDirective,
    InputGroupInputDirective,
    InputGroupTextDirective,
  ],
  template: `<div uiInputGroup size="sm">
    <input uiInputGroupInput aria-label="Amount" />
    <div uiInputGroupAddon align="inline-end">
      <span uiInputGroupText>EUR</span>
      <button uiInputGroupButton size="icon-xs" aria-label="Clear">x</button>
    </div>
  </div>`,
})
class HostComponent {}

describe('InputGroupDirective', () => {
  it('joins a borderless control with its addons, the ring following the control', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const group: HTMLElement = fixture.nativeElement.querySelector('[data-slot="input-group"]');
    const input: HTMLInputElement = group.querySelector('input') as HTMLInputElement;
    const button: HTMLButtonElement = group.querySelector('button') as HTMLButtonElement;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.className).toContain('h-9');
    expect(group.className).toContain(
      'has-[[data-slot=input-group-control]:focus-visible]:outline-signal/12',
    );
    expect(input.getAttribute('data-slot')).toBe('input-group-control');
    expect(input.className).toContain('border-0');
    expect(button.type).toBe('button');
    expect(button.className).toContain('size-7');
    expect(button.className).not.toContain('h-9');
  });

  it('focuses the control when the addon text is clicked, not when its button is', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    fixture.nativeElement.querySelector('button').click();
    expect(document.activeElement).not.toBe(input);
    fixture.nativeElement.querySelector('[data-slot="input-group-text"]').click();
    expect(document.activeElement).toBe(input);
  });
});
