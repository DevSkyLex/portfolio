/**
 * Constant PROJECT_FORM_MESSAGES
 *
 * @description
 * Validation messages the project form gives several fields (`@@admin.project.form.*`): the French
 * text a short field requires, the HTTPS rule of the site address and the length bound of a text.
 *
 * @type {{ readonly frenchRequired: string; readonly httpsRequired: string; readonly maxChars: (max: number) => string }}
 */
export const PROJECT_FORM_MESSAGES: {
  readonly frenchRequired: string;
  readonly httpsRequired: string;
  readonly maxChars: (max: number) => string;
} = {
  frenchRequired: $localize`:@@admin.project.form.frenchRequired:Le texte français est obligatoire.`,
  httpsRequired: $localize`:@@admin.project.form.httpsRequired:Utilisez une URL HTTPS valide.`,
  maxChars: (max: number): string =>
    $localize`:@@admin.project.form.maxChars:${max}:max: caractères maximum.`,
};
