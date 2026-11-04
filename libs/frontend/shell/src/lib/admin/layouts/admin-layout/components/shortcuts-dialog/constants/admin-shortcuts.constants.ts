import { ADMIN_MODIFIER } from '@internal/web-shell/lib/admin/layouts/admin-layout/components/shortcuts-dialog/constants/admin-modifier.constants';
import { ADMIN_SIDEBAR_SHORTCUT } from '@internal/web-shell/lib/admin/layouts/admin-layout/constants/admin-sidebar-layout.constants';
import type { AdminShortcutGroup } from '@internal/web-shell/lib/admin/layouts/admin-layout/components/shortcuts-dialog/models/admin-shortcut/admin-shortcut-group.interface';

/**
 * Constant ADMIN_SHORTCUT_GROUPS
 *
 * @description
 * Shortcuts of the administration (D36), grouped by area: the palette, this help and the sidebar
 * toggle in the layout, saving in the project editor, the article editor's formatting (its toolbar
 * tooltips), moving through the inbox and archiving (a message is marked read by being shown).
 * `ADMIN_MODIFIER` stands for the platform modifier; the dialog spells the caps with
 * `ModifierKeyService.caps` (`⌘ ⌥ ⇧` on Apple platforms) and the spoken words alike; `Shift` is
 * the canonical shift token, shown as the locale's cap (`Maj` in French). Labels are localized
 * (French source); the `id` ties a group to its tab of the dialog whatever the locale.
 *
 * @type {readonly AdminShortcutGroup[]}
 */
export const ADMIN_SHORTCUT_GROUPS: readonly AdminShortcutGroup[] = [
  {
    id: 'general',
    label: $localize`:@@admin.shell.shortcuts.group.general:Général`,
    shortcuts: [
      {
        label: $localize`:@@admin.shell.shortcuts.palette:Ouvrir la palette de commandes`,
        combos: [[ADMIN_MODIFIER, 'K']],
        spoken: `${ADMIN_MODIFIER} K`,
      },
      {
        label: $localize`:@@admin.shell.shortcuts.help:Afficher cette aide`,
        combos: [['?']],
        spoken: $localize`:@@admin.shell.shortcuts.spoken.questionMark:Point d’interrogation`,
      },
      {
        label: $localize`:@@admin.shell.shortcuts.sidebar:Réduire ou déployer la barre latérale`,
        combos: [ADMIN_SIDEBAR_SHORTCUT],
        spoken: $localize`:@@admin.shell.shortcuts.spoken.openBracket:Crochet ouvrant`,
      },
    ],
  },
  {
    id: 'projects',
    label: $localize`:@@admin.shell.shortcuts.group.projects:Projets`,
    shortcuts: [
      {
        label: $localize`:@@admin.shell.shortcuts.save:Enregistrer un projet`,
        combos: [[ADMIN_MODIFIER, 'S']],
        spoken: `${ADMIN_MODIFIER} S`,
      },
    ],
  },
  {
    id: 'article',
    label: $localize`:@@admin.shell.shortcuts.group.article:Article`,
    shortcuts: [
      {
        label: $localize`:@@admin.shell.shortcuts.paragraph:Paragraphe`,
        combos: [[ADMIN_MODIFIER, 'Alt', '0']],
        spoken: `${ADMIN_MODIFIER} Alt 0`,
      },
      {
        label: $localize`:@@admin.shell.shortcuts.heading2:Titre 2`,
        combos: [[ADMIN_MODIFIER, 'Alt', '2']],
        spoken: `${ADMIN_MODIFIER} Alt 2`,
      },
      {
        label: $localize`:@@admin.shell.shortcuts.heading3:Titre 3`,
        combos: [[ADMIN_MODIFIER, 'Alt', '3']],
        spoken: `${ADMIN_MODIFIER} Alt 3`,
      },
      {
        label: $localize`:@@admin.shell.shortcuts.bold:Gras`,
        combos: [[ADMIN_MODIFIER, 'B']],
        spoken: `${ADMIN_MODIFIER} B`,
      },
      {
        label: $localize`:@@admin.shell.shortcuts.italic:Italique`,
        combos: [[ADMIN_MODIFIER, 'I']],
        spoken: `${ADMIN_MODIFIER} I`,
      },
      {
        label: $localize`:@@admin.shell.shortcuts.code:Code`,
        combos: [[ADMIN_MODIFIER, 'E']],
        spoken: `${ADMIN_MODIFIER} E`,
      },
      {
        label: $localize`:@@admin.shell.shortcuts.bulletList:Liste à puces`,
        combos: [[ADMIN_MODIFIER, 'Shift', '8']],
        spoken: `${ADMIN_MODIFIER} Shift 8`,
      },
      {
        label: $localize`:@@admin.shell.shortcuts.orderedList:Liste numérotée`,
        combos: [[ADMIN_MODIFIER, 'Shift', '7']],
        spoken: `${ADMIN_MODIFIER} Shift 7`,
      },
      {
        label: $localize`:@@admin.shell.shortcuts.quote:Citation`,
        combos: [[ADMIN_MODIFIER, 'Shift', 'B']],
        spoken: `${ADMIN_MODIFIER} Shift B`,
      },
      {
        label: $localize`:@@admin.shell.shortcuts.codeBlock:Bloc de code`,
        combos: [[ADMIN_MODIFIER, 'Alt', 'C']],
        spoken: `${ADMIN_MODIFIER} Alt C`,
      },
      {
        label: $localize`:@@admin.shell.shortcuts.undo:Annuler`,
        combos: [[ADMIN_MODIFIER, 'Z']],
        spoken: `${ADMIN_MODIFIER} Z`,
      },
      {
        label: $localize`:@@admin.shell.shortcuts.redo:Rétablir`,
        combos: [[ADMIN_MODIFIER, 'Shift', 'Z']],
        spoken: `${ADMIN_MODIFIER} Shift Z`,
      },
    ],
  },
  {
    id: 'messages',
    label: $localize`:@@admin.shell.shortcuts.group.messages:Messages`,
    shortcuts: [
      {
        label: $localize`:@@admin.shell.shortcuts.navigate:Naviguer entre les messages`,
        combos: [['J'], ['K']],
        spoken: $localize`:@@admin.shell.shortcuts.spoken.jOrK:J ou K`,
      },
      { label: $localize`:@@admin.shell.shortcuts.archive:Archiver`, combos: [['E']], spoken: 'E' },
    ],
  },
];
