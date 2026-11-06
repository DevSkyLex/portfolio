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
const EMAIL: string = 'morgan@example.com';

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

/** Fixed date for the illustrative legal documents. */
export const SEED_LEGAL_UPDATED_AT: Date = new Date('2025-01-15T12:00:00Z');

/** Fictional legal notice used to exercise rich text; not a production legal statement. */
export const SEED_LEGAL_NOTICE: {
  readonly fr: ArticleDocumentProps;
  readonly en: ArticleDocumentProps;
} = {
  fr: doc(
    h2('Exemple de démonstration'),
    p(
      'Ces mentions illustrent un portfolio fictif. Elles ne décrivent aucune personne ni entreprise réelle et doivent être remplacées avant une publication réelle.',
    ),
    h2('Éditeur du site'),
    p('Morgan Exemple, personnage inventé pour le site de démonstration example.com.'),
    p('Contact fictif : ', mail),
    h2('Directeur de la publication'),
    p('Morgan Exemple — identité fictive.'),
    h2('Hébergement'),
    p({ bold: 'Hébergeur' }, ' : Hébergement Démo, organisation imaginaire.'),
    p({ bold: 'Adresse' }, ' : lieu fictif, sans adresse postale utilisable.'),
    p({ bold: 'Site' }, ' : ', { href: 'https://example.com', text: 'example.com' }),
    h2('Propriété intellectuelle'),
    p(
      'Les contenus de ce scénario sont fictifs. Les conditions applicables au logiciel sont définies par la licence du dépôt ; les composants tiers conservent leurs propres licences.',
    ),
    h2('Liens externes'),
    p(
      'Les liens de ce jeu de démonstration utilisent des domaines réservés aux exemples et ne désignent aucun compte social réel.',
    ),
    h2('Données personnelles'),
    p(
      'Consultez l’exemple de ',
      { href: 'https://example.com/privacy', text: 'politique de confidentialité' },
      '.',
    ),
  ),
  en: doc(
    h2('Demonstration example'),
    p(
      'This notice illustrates a fictional portfolio. It describes no real person or company and must be replaced before a real publication.',
    ),
    h2('Publisher'),
    p('Morgan Exemple, an invented persona for the example.com demonstration website.'),
    p('Fictional contact: ', mail),
    h2('Publication director'),
    p('Morgan Exemple — fictional identity.'),
    h2('Hosting'),
    p({ bold: 'Host' }, ': Demo Hosting, an imaginary organisation.'),
    p({ bold: 'Address' }, ': a fictional location, with no usable postal address.'),
    p({ bold: 'Website' }, ': ', { href: 'https://example.com', text: 'example.com' }),
    h2('Intellectual property'),
    p(
      'This scenario contains fictional content. The repository license defines the terms applicable to its software; third-party components retain their own licenses.',
    ),
    h2('External links'),
    p(
      'Links in this demonstration dataset use domains reserved for examples and identify no actual social account.',
    ),
    h2('Personal data'),
    p('See the example ', { href: 'https://example.com/en/privacy', text: 'privacy policy' }, '.'),
  ),
};

/** Illustrative privacy copy, to be adapted to the operator’s actual processing before publication. */
export const SEED_PRIVACY_POLICY: {
  readonly fr: ArticleDocumentProps;
  readonly en: ArticleDocumentProps;
} = {
  fr: doc(
    h2('Exemple de démonstration'),
    p(
      'Cette politique décrit un scénario fictif et ne constitue pas la politique d’un service réel. Utilisez uniquement des données synthétiques dans la démonstration.',
    ),
    h2('Responsable du traitement'),
    p('Morgan Exemple, identité fictive, joignable pour cet exemple à ', mail, '.'),
    h2('Données collectées'),
    p(
      'Le formulaire de démonstration illustre un nom, une adresse e-mail, un objet et un message. Ne saisissez aucune donnée personnelle réelle. Les exemples de messages et de parcours sont inventés.',
    ),
    h2('Utilisation et base légale'),
    p(
      'Dans ce scénario, les données servent à illustrer une réponse à un message. Un exploitant réel doit préciser ses finalités et la base légale de chaque traitement.',
    ),
    h2('Destinataires'),
    p(
      'La démonstration locale utilise une boîte de réception de test. Aucun hébergeur, prestataire de messagerie ni destinataire réel n’est désigné par ce texte.',
    ),
    h2('Durée de conservation'),
    p(
      'Les environnements de test sont jetables. Avant une utilisation réelle, l’exploitant doit documenter ses durées de conservation, ses sauvegardes et ses procédures d’effacement.',
    ),
    h2('Cookies et mesure d’audience'),
    p(
      'Les préférences de thème et de consentement illustrent le stockage local du navigateur. Les sessions de test utilisent des cookies de connexion. Une mesure d’audience réelle et ses destinataires doivent être documentés selon la configuration choisie par l’exploitant.',
    ),
    h2('Vos droits'),
    p(
      'Le contact réservé à cet exemple est ',
      mail,
      '. Un service réel doit indiquer un contact opérationnel pour les demandes relatives aux données personnelles.',
    ),
  ),
  en: doc(
    h2('Demonstration example'),
    p(
      'This policy describes a fictional scenario, not a real service. Use only synthetic data in the demonstration.',
    ),
    h2('Data controller'),
    p('Morgan Exemple, a fictional identity, reachable for this example at ', mail, '.'),
    h2('Data collected'),
    p(
      'The demonstration form illustrates a name, email address, subject and message. Do not enter actual personal data. Example messages and journeys are invented.',
    ),
    h2('Purpose and legal basis'),
    p(
      'In this scenario, data illustrates replying to a message. An actual operator must specify their purposes and the legal basis for each processing activity.',
    ),
    h2('Recipients'),
    p(
      'The local demonstration uses a test mailbox. This text identifies no actual host, email provider or recipient.',
    ),
    h2('Retention period'),
    p(
      'Test environments are disposable. Before actual use, the operator must document retention periods, backups and erasure procedures.',
    ),
    h2('Cookies and audience measurement'),
    p(
      'Theme and consent preferences illustrate browser local storage. Test sessions use login cookies. Actual audience measurement and its recipients must be documented according to the operator’s chosen configuration.',
    ),
    h2('Your rights'),
    p(
      'The contact reserved for this example is ',
      mail,
      '. A real service must provide an operational contact for requests about personal data.',
    ),
  ),
};
