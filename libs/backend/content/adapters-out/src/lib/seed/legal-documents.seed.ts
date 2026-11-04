import type {
  ArticleBlock,
  ArticleDocumentProps,
  ArticleInline,
  ArticleParagraph,
} from '@vfortin/content-domain';

/**
 * Type Run
 * @type Run
 *
 * @description
 * Piece of a paragraph: plain text, or text with a bold mark or a link.
 */
type Run = string | { readonly bold: string } | { readonly href: string; readonly text: string };

/**
 * Constant EMAIL
 *
 * @description
 * Contact address written in both documents.
 */
const EMAIL: string = 'contact@valentin-fortin.pro';

/**
 * Function inline
 *
 * @description
 * Converts the runs of a paragraph into text nodes.
 *
 * @param {readonly Run[]} runs - Pieces in reading order.
 * @returns {ArticleInline[]} Inline content.
 */
function inline(runs: readonly Run[]): ArticleInline[] {
  return runs.map((run: Run): ArticleInline => {
    if (typeof run === 'string') return { type: 'text', text: run };
    if ('bold' in run) return { type: 'text', text: run.bold, marks: [{ type: 'bold' }] };
    return { type: 'text', text: run.text, marks: [{ type: 'link', attrs: { href: run.href } }] };
  });
}

/**
 * Function p
 *
 * @description
 * Builds a paragraph from its runs.
 *
 * @param {...Run[]} runs - Pieces in reading order.
 * @returns {ArticleParagraph} Paragraph.
 */
const p = (...runs: Run[]): ArticleParagraph => ({ type: 'paragraph', content: inline(runs) });

/**
 * Function h2
 *
 * @description
 * Builds a section heading; each one opens a section of the public page.
 *
 * @param {string} value - Heading text.
 * @returns {ArticleBlock} Level-2 heading.
 */
const h2 = (value: string): ArticleBlock => ({
  type: 'heading',
  attrs: { level: 2 },
  content: [{ type: 'text', text: value }],
});

/**
 * Function doc
 *
 * @description
 * Builds a document from its blocks.
 *
 * @param {...ArticleBlock[]} content - Top-level blocks.
 * @returns {ArticleDocumentProps} Document.
 */
const doc = (...content: ArticleBlock[]): ArticleDocumentProps => ({ type: 'doc', content });

/**
 * Constant mail
 *
 * @description
 * Link to the contact address.
 */
const mail: Run = { href: `mailto:${EMAIL}`, text: EMAIL };

/**
 * Constant SEED_LEGAL_UPDATED_AT
 *
 * @description
 * Date of the legal texts the static pages showed (« Dernière mise à jour : 2 novembre 2026 »), kept
 * as the last save of the seeded documents so that the first build shows the same date.
 */
export const SEED_LEGAL_UPDATED_AT: Date = new Date('2026-11-02T12:00:00Z');

/**
 * Constant SEED_LEGAL_NOTICE
 *
 * @description
 * Legal notice of the static page it replaces, in French and English: publisher, publication
 * director, host, intellectual property, external links and personal data. The host details were a
 * definition list; they are bold-labelled paragraphs in the document model.
 */
export const SEED_LEGAL_NOTICE: {
  readonly fr: ArticleDocumentProps;
  readonly en: ArticleDocumentProps;
} = {
  fr: doc(
    h2('Éditeur du site'),
    p('Le site valentin-fortin.pro est édité par Valentin Fortin, particulier.'),
    p('Contact : ', mail),
    p(
      "Conformément à l'article 6, III, 2 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique, l'éditeur, personne physique agissant à titre non professionnel, ne publie pas son adresse postale. Ses coordonnées complètes ont été communiquées à l'hébergeur.",
    ),
    h2('Directeur de la publication'),
    p('Valentin Fortin.'),
    h2('Hébergement'),
    p(
      { bold: 'Hébergeur' },
      ' : OVH SAS, SAS au capital de 50 000 000 €, RCS Lille Métropole 424 761 419 00045',
    ),
    p({ bold: 'Adresse' }, ' : 2 rue Kellermann, 59100 Roubaix, France'),
    p({ bold: 'Téléphone' }, ' : 1007 (depuis la France)'),
    p({ bold: 'Site' }, ' : ', { href: 'https://www.ovhcloud.com', text: 'ovhcloud.com' }),
    h2('Propriété intellectuelle'),
    p(
      'Les textes, les visuels et le code de ce site appartiennent à Valentin Fortin, sauf mention contraire. Leur reproduction sans autorisation écrite est interdite.',
    ),
    p(
      'Les logos des technologies et les noms des entreprises cités appartiennent à leurs détenteurs respectifs. Ils servent uniquement à présenter les projets réalisés.',
    ),
    h2('Liens externes'),
    p(
      "Le site renvoie vers des sites tiers, comme GitHub et LinkedIn. L'éditeur n'a aucun contrôle sur leur contenu et n'en est pas responsable.",
    ),
    h2('Données personnelles'),
    p(
      'Le traitement des données envoyées par le formulaire de contact est décrit dans la ',
      { href: 'https://valentin-fortin.pro/privacy', text: 'politique de confidentialité' },
      '.',
    ),
  ),
  en: doc(
    h2('Publisher'),
    p('The website valentin-fortin.pro is published by Valentin Fortin, a private individual.'),
    p('Contact: ', mail),
    p(
      'In accordance with article 6, III, 2 of French law no. 2004-575 of 21 June 2004 on confidence in the digital economy, the publisher, a private individual acting in a non-professional capacity, does not publish their postal address. Their full contact details have been given to the hosting provider.',
    ),
    h2('Publication director'),
    p('Valentin Fortin.'),
    h2('Hosting'),
    p(
      { bold: 'Host' },
      ': OVH SAS, SAS au capital de 50 000 000 €, RCS Lille Métropole 424 761 419 00045',
    ),
    p({ bold: 'Address' }, ': 2 rue Kellermann, 59100 Roubaix, France'),
    p({ bold: 'Phone' }, ': 1007 (from France)'),
    p({ bold: 'Website' }, ': ', { href: 'https://www.ovhcloud.com', text: 'ovhcloud.com' }),
    h2('Intellectual property'),
    p(
      'The texts, visuals and code of this website belong to Valentin Fortin unless stated otherwise. Reproducing them without written permission is prohibited.',
    ),
    p(
      'Technology logos and company names belong to their respective owners. They are only used to present the projects.',
    ),
    h2('External links'),
    p(
      'This website links to third-party sites such as GitHub and LinkedIn. The publisher has no control over their content and is not responsible for it.',
    ),
    h2('Personal data'),
    p(
      'How data sent through the contact form is processed is described in the ',
      { href: 'https://valentin-fortin.pro/en/privacy', text: 'privacy policy' },
      '.',
    ),
  ),
};

/**
 * Constant SEED_PRIVACY_POLICY
 *
 * @description
 * Privacy policy in French and English: controller, data collected, purpose and legal basis,
 * recipients, retention (three years, the contact purge), cookies and audience measurement (Google
 * Analytics 4 on consent, D48) and rights.
 */
export const SEED_PRIVACY_POLICY: {
  readonly fr: ArticleDocumentProps;
  readonly en: ArticleDocumentProps;
} = {
  fr: doc(
    h2('Responsable du traitement'),
    p('Valentin Fortin, joignable à ', mail, '.'),
    h2('Données collectées'),
    p(
      "Lorsque vous utilisez le formulaire de contact, le site collecte votre nom, votre adresse e-mail, l'objet et le contenu de votre message, et le nom de votre entreprise si vous l'indiquez. Pour limiter les abus, une empreinte de votre adresse IP (jamais l'adresse elle-même) est conservée une heure au plus. Des données de navigation ne sont mesurées qu'avec votre accord (voir « Cookies et mesure d'audience »).",
    ),
    h2('Utilisation et base légale'),
    p(
      "Ces données servent uniquement à répondre à votre message. Le traitement repose sur l'intérêt légitime de l'éditeur à répondre aux demandes qui lui sont adressées (article 6.1.f du RGPD).",
    ),
    h2('Destinataires'),
    p(
      "Seul l'éditeur lit vos messages. Ils transitent par l'hébergeur, OVH SAS, en France, qui assure aussi l'envoi de l'e-mail de notification. Vos données ne sont ni vendues ni cédées.",
    ),
    h2('Durée de conservation'),
    p(
      'Les messages sont supprimés automatiquement trois ans après leur réception, ou plus tôt sur simple demande.',
    ),
    h2("Cookies et mesure d'audience"),
    p(
      "Avec votre accord, le site mesure son audience avec Google Analytics 4, un service de Google Ireland Limited : pages consultées, provenance des visites (moteur de recherche, lien, accès direct), pays, type d'appareil et de navigateur, durée d'engagement. Ces statistiques servent uniquement à savoir comment le site est consulté et à l'améliorer ; elles ne servent ni à la publicité ni au profilage, et les signaux publicitaires de Google sont désactivés.",
    ),
    p(
      "Google Analytics n'est chargé qu'après votre consentement, donné avec « Tout accepter » ou en activant « Mesure d'audience (Google Analytics) » dans « Personnaliser ». Tant que vous n'avez pas choisi, ou si vous choisissez « Tout refuser », aucun cookie de mesure n'est déposé et aucune requête n'est envoyée à Google ; refuser n'empêche pas d'utiliser le site. La base légale est votre consentement (article 6.1.a du RGPD et article 82 de la loi Informatique et Libertés).",
    ),
    p(
      "Une fois votre accord donné, Google Analytics dépose les cookies _ga et _ga_<identifiant>, qui distinguent les visiteurs de façon pseudonyme. Leur durée de vie est limitée à 13 mois et n'est pas prolongée à chaque visite. Les données de mesure sont conservées 14 mois dans Google Analytics, puis supprimées. Les stockages publicitaires (ad_storage, ad_user_data, ad_personalization) restent toujours refusés.",
    ),
    p(
      'Les données de mesure peuvent être transférées à Google LLC, aux États-Unis. Ce transfert repose sur le cadre de protection des données UE–États-Unis (Data Privacy Framework), auquel Google LLC est certifiée, reconnu adéquat par la Commission européenne le 10 juillet 2023.',
    ),
    p(
      'Votre choix est enregistré avec sa date dans le stockage local de votre navigateur et vous est redemandé au bout de 6 mois. Vous pouvez le modifier ou retirer votre consentement à tout moment avec le lien « Gérer les cookies » en bas de chaque page ou le bouton du même nom sur cette page ; le retrait arrête la mesure et supprime les cookies _ga de votre navigateur.',
    ),
    p(
      "Votre choix de thème est lui aussi enregistré dans le stockage local de votre navigateur ; il n'en sort pas. L'espace d'administration, réservé à l'éditeur, utilise en outre un cookie de session indispensable à la connexion.",
    ),
    h2('Vos droits'),
    p(
      'Vous pouvez accéder à vos données, les faire rectifier ou effacer, en limiter le traitement, vous y opposer et en demander la portabilité en écrivant à ',
      mail,
      '.',
    ),
    p(
      'Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL sur ',
      { href: 'https://www.cnil.fr', text: 'cnil.fr' },
      '.',
    ),
  ),
  en: doc(
    h2('Data controller'),
    p('Valentin Fortin, who can be reached at ', mail, '.'),
    h2('Data collected'),
    p(
      'When you use the contact form, the website collects your name, your email address, the subject and content of your message, and your company name if you give it. To prevent abuse, a fingerprint of your IP address (never the address itself) is kept for one hour at most. Browsing data is only measured with your consent (see “Cookies and audience measurement”).',
    ),
    h2('Purpose and legal basis'),
    p(
      "This data is only used to reply to your message. The processing is based on the publisher's legitimate interest in answering the requests sent to them (article 6.1.f of the GDPR).",
    ),
    h2('Recipients'),
    p(
      'Only the publisher reads your messages. They pass through the hosting provider, OVH SAS, in France, which also sends the notification email. Your data is neither sold nor transferred.',
    ),
    h2('Retention period'),
    p(
      'Messages are deleted automatically three years after they are received, or earlier on request.',
    ),
    h2('Cookies and audience measurement'),
    p(
      'With your consent, the website measures its audience with Google Analytics 4, a service of Google Ireland Limited: pages viewed, where visits come from (search engine, link, direct access), country, device and browser type, engagement time. These statistics are only used to understand how the website is used and to improve it; they are used neither for advertising nor for profiling, and Google advertising signals are turned off.',
    ),
    p(
      'Google Analytics is only loaded after your consent, given with “Accept all” or by turning on “Audience measurement (Google Analytics)” under “Customise”. Until you choose, or if you choose “Reject all”, no measurement cookie is set and no request is sent to Google; rejecting does not prevent you from using the website. The legal basis is your consent (article 6.1.a of the GDPR and article 82 of the French Data Protection Act).',
    ),
    p(
      'Once you consent, Google Analytics sets the _ga and _ga_<identifier> cookies, which tell visitors apart pseudonymously. Their lifetime is limited to 13 months and is not extended on each visit. Measurement data is kept for 14 months in Google Analytics, then deleted. Advertising storage (ad_storage, ad_user_data, ad_personalization) always stays denied.',
    ),
    p(
      'Measurement data may be transferred to Google LLC in the United States. This transfer relies on the EU–US Data Privacy Framework, under which Google LLC is certified, recognised as adequate by the European Commission on 10 July 2023.',
    ),
    p(
      "Your choice is saved with its date in your browser's local storage and you are asked again after 6 months. You can change it or withdraw your consent at any time with the “Manage cookies” link at the bottom of every page or the button of the same name on this page; withdrawing stops the measurement and deletes the _ga cookies from your browser.",
    ),
    p(
      "Your theme choice is also saved in your browser's local storage; it never leaves it. The administration area, reserved for the publisher, also uses a session cookie required to sign in.",
    ),
    h2('Your rights'),
    p(
      'You can access your data, have it corrected or erased, restrict its processing, object to it and ask for its portability by writing to ',
      mail,
      '.',
    ),
    p(
      'If you believe your rights are not respected, you can lodge a complaint with the CNIL, the French data protection authority, at ',
      { href: 'https://www.cnil.fr', text: 'cnil.fr' },
      '.',
    ),
  ),
};
