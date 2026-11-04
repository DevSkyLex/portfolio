import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AutocompleteComponent } from '@internal/ui/lib/autocomplete/autocomplete.component';
import { InputDirective } from '@internal/ui/lib/input/input.directive';
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

/**
 * Component CatalogueControlsHostComponent
 * @class CatalogueControlsHostComponent
 *
 * @description
 * Puts a `uiInput` and a `ui-autocomplete` in input groups with a button addon each, next to a
 * `uiInput` outside any group.
 */
@Component({
  imports: [
    AutocompleteComponent,
    InputDirective,
    InputGroupAddonDirective,
    InputGroupButtonDirective,
    InputGroupDirective,
  ],
  template: `<div uiInputGroup size="sm" data-testid="native">
      <input uiInput id="title" aria-label="Intitulé" />
      <div uiInputGroupAddon align="inline-end">
        <span data-testid="gap">FR</span>
        <button uiInputGroupButton aria-label="Anglais">EN</button>
      </div>
    </div>
    <div uiInputGroup size="sm" data-testid="composite">
      <ui-autocomplete inputId="place" ariaLabel="Lieu" [options]="['Tours']" />
      <div uiInputGroupAddon align="inline-end">
        <button uiInputGroupButton aria-label="Anglais">EN</button>
      </div>
    </div>
    <input uiInput id="alone" aria-label="Seul" />`,
})
class CatalogueControlsHostComponent {}

describe('InputGroupDirective', () => {
  it('turns a uiInput in a group, direct or inside ui-autocomplete, into the frameless group control', async () => {
    const fixture: ComponentFixture<CatalogueControlsHostComponent> = TestBed.createComponent(
      CatalogueControlsHostComponent,
    );
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const title: HTMLInputElement = root.querySelector('#title') as HTMLInputElement;
    const place: HTMLInputElement = root.querySelector('#place') as HTMLInputElement;
    const alone: HTMLInputElement = root.querySelector('#alone') as HTMLInputElement;
    for (const control of [title, place]) {
      expect(control.getAttribute('data-slot')).toBe('input-group-control');
      expect(control.className).toContain('border-0');
      expect(control.className).not.toContain('border-border-field');
    }
    expect(alone.getAttribute('data-slot')).toBe('input');
    expect(alone.className).toContain('border-border-field');
    // The autocomplete fills the group row beside its addon.
    expect(root.querySelector('ui-autocomplete')?.className).toContain('flex-1');

    // A click on the addon outside its button focuses the control, even a nested one.
    (root.querySelector('[data-testid="gap"]') as HTMLElement).click();
    expect(document.activeElement).toBe(title);
    (
      root.querySelector('[data-testid="composite"] [data-slot="input-group-addon"]') as HTMLElement
    ).click();
    expect(document.activeElement).toBe(place);
  });

  it('joins a borderless control with its addons, the ring following the control', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const group: HTMLElement = fixture.nativeElement.querySelector('[data-slot="input-group"]');
    const input: HTMLInputElement = group.querySelector('input') as HTMLInputElement;
    const button: HTMLButtonElement = group.querySelector('button') as HTMLButtonElement;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.className).toContain('h-9');
    expect(group.className).toContain(
      'has-[[data-slot=input-group-control]:focus-visible]:outline-accent/12',
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
