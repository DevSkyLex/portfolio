import { KbdHintComponent } from '@internal/ui/lib/kbd/components/kbd-hint/kbd-hint.component';
import { KbdDirective, KbdGroupDirective } from '@internal/ui/lib/kbd/kbd.directive';

/**
 * Constant KBD_IMPORTS
 *
 * @description
 * Standalone directives and the hint component exported as the keyboard-key template import bundle.
 */
export const KBD_IMPORTS = [KbdDirective, KbdGroupDirective, KbdHintComponent] as const;
