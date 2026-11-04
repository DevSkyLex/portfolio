/**
 * Constant TWO_FACTOR_TOASTS
 *
 * @description
 * Localized toasts of the security page (French source, English targets).
 */
export const TWO_FACTOR_TOASTS = {
  enabled: $localize`:@@admin.security.toast.enabled:Double authentification activée.`,
  disabled: $localize`:@@admin.security.toast.disabled:Double authentification désactivée.`,
  copied: $localize`:@@admin.security.toast.copied:Clé copiée.`,
  copyFailed: $localize`:@@admin.security.toast.copyFailed:Copie impossible. Sélectionnez la clé pour la copier.`,
} as const;
