import type { AdminShortcutGroup } from '@internal/web-shell/lib/admin/layouts/admin-layout/components/shortcuts-dialog/models/admin-shortcut/admin-shortcut-group.interface';

/**
 * Constant ADMIN_SHORTCUT_GROUPS
 *
 * @description
 * Shortcuts of the administration (D36), grouped by area: the palette and this help in the layout,
 * saving in the project editor, moving and acting in the inbox.
 *
 * @type {readonly AdminShortcutGroup[]}
 */
export const ADMIN_SHORTCUT_GROUPS: readonly AdminShortcutGroup[] = [
  {
    label: 'Général',
    shortcuts: [
      {
        label: 'Ouvrir la palette de commandes',
        combos: [
          ['Ctrl', 'K'],
          ['⌘', 'K'],
        ],
        spoken: 'Contrôle K ou Commande K',
      },
      { label: 'Afficher cette aide', combos: [['?']], spoken: 'Point d’interrogation' },
    ],
  },
  {
    label: 'Projets',
    shortcuts: [
      {
        label: 'Enregistrer un projet',
        combos: [
          ['Ctrl', 'S'],
          ['⌘', 'S'],
        ],
        spoken: 'Contrôle S ou Commande S',
      },
    ],
  },
  {
    label: 'Messages',
    shortcuts: [
      { label: 'Naviguer entre les messages', combos: [['J'], ['K']], spoken: 'J ou K' },
      { label: 'Marquer comme lu', combos: [['R']], spoken: 'R' },
      { label: 'Archiver', combos: [['E']], spoken: 'E' },
    ],
  },
];
