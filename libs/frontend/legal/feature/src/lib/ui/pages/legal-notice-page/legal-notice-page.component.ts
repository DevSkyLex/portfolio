import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalArticleComponent } from '@internal/legal-web-feature/lib/ui/components/legal-article/legal-article.component';

/**
 * Component LegalNoticePageComponent
 * @class LegalNoticePageComponent
 *
 * @description
 * Renders the site's legal notice with publisher, hosting, intellectual property, external link,
 * and privacy policy information.
 */
@Component({
  selector: 'legal-notice-page',
  imports: [LegalArticleComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <legal-article [heading]="heading">
      <section aria-labelledby="legal-publisher">
        <h2 id="legal-publisher" i18n="@@legal.publisher.title">Éditeur du site</h2>
        <p i18n="@@legal.publisher.body">
          Le site valentin-fortin.pro est édité par Valentin Fortin, particulier.
        </p>
        <p i18n="@@legal.publisher.contact">
          Contact :
          <a href="mailto:contact@valentin-fortin.pro">contact&#64;valentin-fortin.pro</a>
        </p>
        <p i18n="@@legal.publisher.address">
          Conformément à l'article 6, III, 2 de la loi n° 2004-575 du 21 juin 2004 pour la confiance
          dans l'économie numérique, l'éditeur, personne physique agissant à titre non
          professionnel, ne publie pas son adresse postale. Ses coordonnées complètes ont été
          communiquées à l'hébergeur.
        </p>
      </section>
      <section aria-labelledby="legal-director">
        <h2 id="legal-director" i18n="@@legal.director.title">Directeur de la publication</h2>
        <p>Valentin Fortin.</p>
      </section>
      <section aria-labelledby="legal-host">
        <h2 id="legal-host" i18n="@@legal.host.title">Hébergement</h2>
        <dl>
          <div>
            <dt i18n="@@legal.host.name">Hébergeur</dt>
            <dd>OVH SAS, SAS au capital de 50 000 000 €, RCS Lille Métropole 424 761 419 00045</dd>
          </div>
          <div>
            <dt i18n="@@legal.host.address">Adresse</dt>
            <dd>2 rue Kellermann, 59100 Roubaix, France</dd>
          </div>
          <div>
            <dt i18n="@@legal.host.phone">Téléphone</dt>
            <dd i18n="@@legal.host.phoneValue">1007 (depuis la France)</dd>
          </div>
          <div>
            <dt i18n="@@legal.host.site">Site</dt>
            <dd><a href="https://www.ovhcloud.com">ovhcloud.com</a></dd>
          </div>
        </dl>
      </section>
      <section aria-labelledby="legal-ip">
        <h2 id="legal-ip" i18n="@@legal.ip.title">Propriété intellectuelle</h2>
        <p i18n="@@legal.ip.body">
          Les textes, les visuels et le code de ce site appartiennent à Valentin Fortin, sauf
          mention contraire. Leur reproduction sans autorisation écrite est interdite.
        </p>
        <p i18n="@@legal.ip.brands">
          Les logos des technologies et les noms des entreprises cités appartiennent à leurs
          détenteurs respectifs. Ils servent uniquement à présenter les projets réalisés.
        </p>
      </section>
      <section aria-labelledby="legal-links">
        <h2 id="legal-links" i18n="@@legal.links.title">Liens externes</h2>
        <p i18n="@@legal.links.body">
          Le site renvoie vers des sites tiers, comme GitHub et LinkedIn. L'éditeur n'a aucun
          contrôle sur leur contenu et n'en est pas responsable.
        </p>
      </section>
      <section aria-labelledby="legal-data">
        <h2 id="legal-data" i18n="@@legal.data.title">Données personnelles</h2>
        <p i18n="@@legal.data.body">
          Le traitement des données envoyées par le formulaire de contact est décrit dans la
          <a routerLink="/privacy">politique de confidentialité</a>.
        </p>
      </section>
    </legal-article>
  `,
})
export class LegalNoticePageComponent {
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
  protected readonly heading: string = $localize`:@@legal.notice.title:Mentions légales`;
  // #endregion
}
