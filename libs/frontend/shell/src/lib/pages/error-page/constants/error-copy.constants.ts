import type { ErrorCode } from '@internal/web-shell/lib/pages/error-page/models/error-code.model';
import type { ErrorCopy } from '@internal/web-shell/lib/pages/error-page/models/error-copy/error-copy.interface';

/**
 * Constant ERROR_COPY
 *
 * @description
 * French page copy and retry affordance keyed by each supported error route code.
 *
 * @type {Readonly<Record<ErrorCode, ErrorCopy>>}
 */
export const ERROR_COPY: Readonly<Record<ErrorCode, ErrorCopy>> = {
  '404': {
    title: $localize`:@@error.404.title:Page introuvable`,
    text: $localize`:@@error.404.text:Cette page n'existe pas, ou elle a changé d'adresse. Le reste du site est toujours là.`,
    retry: false,
  },
  '403': {
    title: $localize`:@@error.403.title:Accès refusé`,
    text: $localize`:@@error.403.text:Vous n'avez pas l'autorisation d'ouvrir cette page.`,
    retry: false,
  },
  '500': {
    title: $localize`:@@error.500.title:Erreur du serveur`,
    text: $localize`:@@error.500.text:Quelque chose s'est mal passé de mon côté. Réessayez dans quelques instants ; si ça continue, écrivez-moi.`,
    retry: true,
  },
  '503': {
    title: $localize`:@@error.503.title:Site en maintenance`,
    text: $localize`:@@error.503.text:Le site est en cours de mise à jour. Il revient dans quelques minutes.`,
    retry: true,
  },
};
