import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { menuLabelClasses } from '@internal/ui/lib/menu-panel/constants/menu-panel.constants';
import { CommandItemDirective } from '@internal/ui/lib/command/directives/command-item/command-item.directive';
import { COMMAND_HOST } from '@internal/ui/lib/command/tokens/command/command.token';
import type { CommandHost } from '@internal/ui/lib/command/models/command/command-host.interface';

/**
 * Class CommandGroupComponent
 * @class CommandGroupComponent
 *
 * @description
 * Labels related command items and hides the group when none of its descendant items matches the
 * owning palette's current query.
 */
@Component({
  selector: 'ui-command-group',
  template: `
    @if (heading()) {
      <div
        aria-hidden="true"
        data-slot="command-group-heading"
        [id]="headingId"
        [class]="labelClasses"
      >
        {{ heading() }}
      </div>
    }
    <ng-content />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    class: 'flex flex-col',
    '[attr.aria-labelledby]': 'heading() ? headingId : null',
    '[attr.hidden]': 'visible() ? null : ""',
    'data-slot': 'command-group',
  },
})
export class CommandGroupComponent {
  // #region Properties
  /**
   * Property heading
   * @readonly
   *
   * @description
   * Optional visible label and accessible name for this group.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly heading: InputSignal<string | undefined> = input<string>();

  /**
   * Property headingId
   * @readonly
   *
   * @description
   * Unique identifier assigned to the rendered heading for the group's `aria-labelledby` link.
   *
   * @type {string}
   */
  protected readonly headingId: string =
    inject<RenderIdService>(RenderIdService).next('ui-command-group-');

  /**
   * Property labelClasses
   * @readonly
   *
   * @description
   * Shared menu-heading classes used to align command group labels with other menu parts.
   *
   * @type {string}
   */
  protected readonly labelClasses: string = menuLabelClasses;

  /**
   * Property command
   * @readonly
   *
   * @description
   * Owning palette contract used to test descendant item visibility.
   *
   * @type {CommandHost}
   */
  private readonly command: CommandHost = inject<CommandHost>(COMMAND_HOST);

  /**
   * Property items
   * @readonly
   *
   * @description
   * Descendant items considered when determining whether the group has any matching command.
   *
   * @type {Signal<readonly CommandItemDirective[]>}
   */
  private readonly items: Signal<readonly CommandItemDirective[]> =
    contentChildren<CommandItemDirective>(CommandItemDirective, { descendants: true });

  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether at least one descendant item passes the palette's current visibility rule.
   *
   * @type {Signal<boolean>}
   */
  protected readonly visible: Signal<boolean> = computed<boolean>(() =>
    this.items().some((item) => this.command.isVisible(item)),
  );
  // #endregion
}
