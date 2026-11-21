import {
  lucideBriefcase,
  lucideBookOpen,
  lucideConstruction,
  lucideGraduationCap,
  lucideInbox,
  lucideInfo,
  lucideLayoutDashboard,
  lucideMessageCircleQuestionMark,
  lucideScale,
  lucideShield,
} from '@ng-icons/lucide';
import type { AdminLink } from '@internal/web-shell/lib/admin/layouts/admin-layout/models/admin-link/admin-link.interface';

/**
 * Constant ADMIN_LINKS
 *
 * @description
 * Administration sections shown in the sidebar, which turns into a top bar below 1024px, and in the
 * palette's "Aller à" group.
 *
 * @type {readonly AdminLink[]}
 */
export const ADMIN_LINKS: readonly AdminLink[] = [
  {
    path: '/admin/dashboard',
    label: $localize`:@@admin.shell.nav.dashboard:Tableau de bord`,
    icon: lucideLayoutDashboard,
  },
  {
    path: '/admin/articles',
    label: $localize`:@@admin.shell.nav.articles:Articles`,
    icon: lucideBookOpen,
  },
  {
    path: '/admin/experiences',
    label: $localize`:@@admin.shell.nav.experiences:Expériences`,
    icon: lucideBriefcase,
  },
  {
    path: '/admin/education',
    label: $localize`:@@admin.shell.nav.education:Formations`,
    icon: lucideGraduationCap,
  },
  {
    path: '/admin/faq',
    label: $localize`:@@admin.shell.nav.faq:FAQ`,
    icon: lucideMessageCircleQuestionMark,
  },
  {
    path: '/admin/information',
    label: $localize`:@@admin.shell.nav.information:Informations`,
    icon: lucideInfo,
  },
  { path: '/admin/legal', label: $localize`:@@admin.shell.nav.legal:Légal`, icon: lucideScale },
  {
    path: '/admin/maintenance',
    label: $localize`:@@admin.shell.nav.maintenance:Maintenance`,
    icon: lucideConstruction,
  },
  {
    path: '/admin/messages',
    label: $localize`:@@admin.shell.nav.messages:Messages`,
    icon: lucideInbox,
  },
  {
    path: '/admin/security',
    label: $localize`:@@admin.shell.nav.security:Sécurité`,
    icon: lucideShield,
  },
];

/**
 * Constant ADMIN_MESSAGES_PATH
 *
 * @description
 * Section whose sidebar entry carries the unread message count.
 *
 * @type {string}
 */
export const ADMIN_MESSAGES_PATH = '/admin/messages' as const;
