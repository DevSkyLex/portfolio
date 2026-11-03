import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LegalArticleComponent } from '@internal/legal-web-feature/lib/ui/components/legal-article/legal-article.component';

/**
 * Component PrivacyPageComponent
 * @class PrivacyPageComponent
 *
 * @description
 * Renders the site's French privacy notice, including contact-form data use, retention, cookies,
 * and data subject rights.
 */
@Component({
  selector: 'legal-privacy-page',
  imports: [LegalArticleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <legal-article [heading]="heading">
      <section aria-labelledby="privacy-controller">
        <h2 id="privacy-controller" i18n="@@legal.controller.title">Responsable du traitement</h2>
        <p i18n="@@legal.controller.body">
          Valentin Fortin, joignable à
          <a href="mailto:contact@valentin-fortin.pro">contact&#64;valentin-fortin.pro</a>.
        </p>
      </section>
      <section aria-labelledby="privacy-collected">
        <h2 id="privacy-collected" i18n="@@legal.collected.title">Données collectées</h2>
        <p i18n="@@legal.collected.body">
          Le site ne collecte des données que lorsque vous utilisez le formulaire de contact : votre
          nom, votre adresse e-mail, l'objet et le contenu de votre message, et le nom de votre
          entreprise si vous l'indiquez. Pour limiter les abus, une empreinte de votre adresse IP
          (jamais l'adresse elle-même) est conservée une heure au plus.
        </p>
      </section>
      <section aria-labelledby="privacy-basis">
        <h2 id="privacy-basis" i18n="@@legal.basis.title">Utilisation et base légale</h2>
        <p i18n="@@legal.basis.body">
          Ces données servent uniquement à répondre à votre message. Le traitement repose sur
          l'intérêt légitime de l'éditeur à répondre aux demandes qui lui sont adressées (article
          6.1.f du RGPD).
        </p>
      </section>
      <section aria-labelledby="privacy-recipients">
        <h2 id="privacy-recipients" i18n="@@legal.recipients.title">Destinataires</h2>
        <p i18n="@@legal.recipients.body">
          Seul l'éditeur lit vos messages. Ils transitent par l'hébergeur, OVH SAS, en France, qui
          assure aussi l'envoi de l'e-mail de notification. Vos données ne sont ni vendues ni
          cédées.
        </p>
      </section>
      <section aria-labelledby="privacy-retention">
        <h2 id="privacy-retention" i18n="@@legal.retention.title">Durée de conservation</h2>
        <p i18n="@@legal.retention.body">
          Les messages sont supprimés automatiquement trois ans après leur réception, ou plus tôt
          sur simple demande.
        </p>
      </section>
      <section aria-labelledby="privacy-cookies">
        <h2 id="privacy-cookies" i18n="@@legal.cookies.title">Cookies</h2>
        <p i18n="@@legal.cookies.body">
          Le site ne dépose aucun cookie chez ses visiteurs et n'utilise aucun outil de mesure
          d'audience. Seul l'espace d'administration, réservé à l'éditeur, utilise un cookie de
          session indispensable à la connexion.
        </p>
        <p i18n="@@legal.cookies.storage">
          Votre choix de thème est enregistré dans le stockage local de votre navigateur ; il n'en
          sort pas.
        </p>
      </section>
      <section aria-labelledby="privacy-rights">
        <h2 id="privacy-rights" i18n="@@legal.rights.title">Vos droits</h2>
        <p i18n="@@legal.rights.body">
          Vous pouvez accéder à vos données, les faire rectifier ou effacer, en limiter le
          traitement, vous y opposer et en demander la portabilité en écrivant à
          <a href="mailto:contact@valentin-fortin.pro">contact&#64;valentin-fortin.pro</a>.
        </p>
        <p i18n="@@legal.rights.cnil">
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation
          à la CNIL sur <a href="https://www.cnil.fr">cnil.fr</a>.
        </p>
      </section>
    </legal-article>
  `,
})
export class PrivacyPageComponent {
  // #region Properties
  /**
   * Property heading
   * @readonly
   *
   * @description
   * Localized page heading passed to the shared legal article layout.
   *
   * @type {string}
   */
  protected readonly heading: string = $localize`:@@legal.privacy.title:Politique de confidentialité`;
  // #endregion
}
