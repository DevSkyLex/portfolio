import type {
  ArticleBlock,
  ArticleDocumentProps,
  ArticleInline,
  ArticleParagraph,
} from '@vfortin/content-domain';
import { sql } from 'drizzle-orm';
import type {
  ContentDatabase,
  ContentTransaction,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import {
  type ProfileLinksColumn,
  contentRevision,
  legalDocuments,
  profile,
  projects,
  skillGroups,
  timelineEntries,
  timelineLists,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';
import {
  SEED_LEGAL_NOTICE,
  SEED_LEGAL_UPDATED_AT,
  SEED_PRIVACY_POLICY,
} from '@internal/content-adapters-out/lib/seed/legal-documents.seed';

/*
 * Fictional demonstration content in French and English.
 * Names, organisations, projects and career details do not describe a real person.
 */
/**
 * Type ProjectRow
 * @type ProjectRow
 *
 * @description
 * Insert shape inferred from the projects Drizzle table for static seed data.
 */
type ProjectRow = typeof projects.$inferInsert;

/**
 * Type TimelineRow
 * @type TimelineRow
 *
 * @description
 * Insert shape inferred from the timeline entries table.
 */
type TimelineRow = typeof timelineEntries.$inferInsert;

/**
 * Type SkillRow
 * @type SkillRow
 *
 * @description
 * Insert shape inferred from the skill groups table.
 */
type SkillRow = typeof skillGroups.$inferInsert;

/**
 * Type ProfileRow
 * @type ProfileRow
 *
 * @description
 * Insert shape inferred from the singleton profile table.
 */
type ProfileRow = typeof profile.$inferInsert;

/**
 * Function text
 *
 * @description
 * Builds the inline content of a paragraph or heading.
 *
 * @param {string} value - Non-empty text.
 * @returns {ArticleInline[]} Single text node.
 */
const text = (value: string): ArticleInline[] => [{ type: 'text', text: value }];

/**
 * Function doc
 *
 * @description
 * Builds an article document from its blocks.
 *
 * @param {ArticleBlock[]} content - Top-level blocks.
 * @returns {ArticleDocumentProps} Document stored in `projects.article`.
 */
const doc = (...content: ArticleBlock[]): ArticleDocumentProps => ({ type: 'doc', content });

/**
 * Function h2
 *
 * @description
 * Builds a section heading; level-2 headings form the public table of contents.
 *
 * @param {string} value - Heading text.
 * @returns {ArticleBlock} Level-2 heading.
 */
const h2 = (value: string): ArticleBlock => ({
  type: 'heading',
  attrs: { level: 2 },
  content: text(value),
});

/**
 * Function p
 *
 * @description
 * Builds a paragraph.
 *
 * @param {string} value - Paragraph text.
 * @returns {ArticleParagraph} Paragraph.
 */
const p = (value: string): ArticleParagraph => ({ type: 'paragraph', content: text(value) });

/**
 * Function ul
 *
 * @description
 * Builds a bullet list with one paragraph per item.
 *
 * @param {string[]} items - Item texts.
 * @returns {ArticleBlock} Bullet list.
 */
const ul = (...items: string[]): ArticleBlock => ({
  type: 'bulletList',
  content: items.map((item: string) => ({ type: 'listItem' as const, content: [p(item)] })),
});

/** Fictional published projects used by local development and automated acceptance. */
export const SEED_PROJECTS: ProjectRow[] = [
  {
    id: 'project-library-trails',
    slug: 'library-trails',
    title: { fr: 'Parcours de lecture', en: 'Reading trails' },
    summary: {
      fr: 'Une bibliothèque fictive propose des parcours de lecture accessibles, classés par envie et durée.',
      en: 'A fictional library offers accessible reading trails grouped by interest and reading time.',
    },
    lead: {
      fr: 'Une bibliothèque fictive propose des parcours de lecture accessibles, classés par envie et durée.',
      en: 'A fictional library offers accessible reading trails grouped by interest and reading time.',
    },
    period: { start: { year: 2025, month: 2 }, end: { year: 2025, month: 10 } },
    client: { fr: 'Collectif Lecture ouverte', en: 'Open Reading Collective' },
    role: { fr: 'Design d’interface et prototypage', en: 'Interface design and prototyping' },
    place: { fr: 'Ville-Exemple — lieu fictif', en: 'Example Town — fictional location' },
    siteUrl: 'https://example.com/demos/library-trails',
    techs: ['vue', 'typescript', 'css'],
    featured: true,
    position: 0,
    status: 'published',
    version: 1,
    article: {
      fr: doc(
        h2('Scénario fictif'),
        p(
          'Le catalogue de démonstration relie des ouvrages inventés à des parcours courts. Aucun emprunt réel ni compte de lecteur ne sont utilisés.',
        ),
        h2('Démarche'),
        p(
          'Des ateliers avec des personnages fictifs ont servi à organiser la navigation et les filtres.',
        ),
        h2('Résultat de démonstration'),
        p(
          'Les états vides, le clavier et les contrastes ont été vérifiés sur un prototype autonome.',
        ),
        ul('Données entièrement fictives', 'Navigation au clavier'),
      ),
      en: doc(
        h2('Fictional scenario'),
        p(
          'The demonstration catalogue connects invented books to short reading trails. It uses no actual loans or reader accounts.',
        ),
        h2('Approach'),
        p('Workshops with fictional personas informed the navigation and filters.'),
        h2('Demonstration outcome'),
        p('Empty states, keyboard use and contrast were checked in a standalone prototype.'),
        ul('Entirely fictional data', 'Keyboard navigation'),
      ),
    },
    cover: null,
  },
  {
    id: 'project-workshop-calendar',
    slug: 'workshop-calendar',
    title: { fr: 'Agenda des ateliers', en: 'Workshop calendar' },
    summary: {
      fr: 'Un agenda de démonstration pour organiser les ateliers créatifs d’une maison de quartier imaginaire.',
      en: 'A demonstration calendar for creative workshops at an imaginary community centre.',
    },
    lead: {
      fr: 'Un agenda de démonstration pour organiser les ateliers créatifs d’une maison de quartier imaginaire.',
      en: 'A demonstration calendar for creative workshops at an imaginary community centre.',
    },
    period: { start: { year: 2024, month: 2 }, end: { year: 2024, month: 10 } },
    client: { fr: 'Maison des idées — démonstration', en: 'House of Ideas — demonstration' },
    role: { fr: 'Design d’interface et prototypage', en: 'Interface design and prototyping' },
    place: { fr: 'Ville-Exemple — lieu fictif', en: 'Example Town — fictional location' },
    siteUrl: 'https://example.com/demos/workshop-calendar',
    techs: ['react', 'typescript', 'nodejs'],
    featured: false,
    position: 1,
    status: 'published',
    version: 1,
    article: {
      fr: doc(
        h2('Scénario fictif'),
        p(
          'Le scénario présente des ateliers de gravure, de reliure et de dessin dans un lieu entièrement inventé.',
        ),
        h2('Démarche'),
        p('Le prototype sépare la consultation du programme et la réservation de places fictives.'),
        h2('Résultat de démonstration'),
        p(
          'Les messages de confirmation expliquent les étapes suivantes sans envoyer de notification à une personne réelle.',
        ),
        ul('Données entièrement fictives', 'Navigation au clavier'),
      ),
      en: doc(
        h2('Fictional scenario'),
        p(
          'The scenario presents printmaking, bookbinding and drawing workshops at an entirely invented venue.',
        ),
        h2('Approach'),
        p('The prototype separates browsing the programme from reserving fictional places.'),
        h2('Demonstration outcome'),
        p('Confirmation messages explain the next steps without notifying a real person.'),
        ul('Entirely fictional data', 'Keyboard navigation'),
      ),
    },
    cover: null,
  },
  {
    id: 'project-neighborhood-atlas',
    slug: 'neighborhood-atlas',
    title: { fr: 'Atlas du quartier', en: 'Neighbourhood atlas' },
    summary: {
      fr: 'Une carte éditoriale de lieux imaginaires, conçue pour explorer des informations sans dépendre de la carte.',
      en: 'An editorial map of imaginary places, designed to make information available without relying on the map.',
    },
    lead: {
      fr: 'Une carte éditoriale de lieux imaginaires, conçue pour explorer des informations sans dépendre de la carte.',
      en: 'An editorial map of imaginary places, designed to make information available without relying on the map.',
    },
    period: { start: { year: 2022, month: 2 }, end: { year: 2022, month: 10 } },
    client: { fr: 'Atelier Lanterne de papier', en: 'Paper Lantern Studio' },
    role: { fr: 'Design d’interface et prototypage', en: 'Interface design and prototyping' },
    place: { fr: 'Ville-Exemple — lieu fictif', en: 'Example Town — fictional location' },
    siteUrl: 'https://example.com/demos/neighborhood-atlas',
    techs: ['svelte', 'typescript', 'css'],
    featured: false,
    position: 2,
    status: 'published',
    version: 1,
    article: {
      fr: doc(
        h2('Scénario fictif'),
        p(
          'Les lieux, les adresses et les itinéraires du scénario sont fictifs. Le projet illustre une alternative textuelle à une carte visuelle.',
        ),
        h2('Démarche'),
        p(
          'Les cartes de lieux utilisent des libellés explicites et une progression cohérente au clavier.',
        ),
        h2('Résultat de démonstration'),
        p('La vue liste conserve les mêmes informations et filtres que la carte.'),
        ul('Données entièrement fictives', 'Navigation au clavier'),
      ),
      en: doc(
        h2('Fictional scenario'),
        p(
          'Places, addresses and routes in this scenario are fictional. The project illustrates a textual alternative to a visual map.',
        ),
        h2('Approach'),
        p('Place cards use explicit labels and consistent keyboard navigation.'),
        h2('Demonstration outcome'),
        p('The list view retains the same information and filters as the map.'),
        ul('Entirely fictional data', 'Keyboard navigation'),
      ),
    },
    cover: null,
  },
  {
    id: 'project-accessibility-notebook',
    slug: 'accessibility-notebook',
    title: { fr: 'Carnet d’accessibilité', en: 'Accessibility notebook' },
    summary: {
      fr: 'Un carnet pédagogique de démonstration pour documenter les observations d’accessibilité sur des interfaces inventées.',
      en: 'An educational demonstration notebook for accessibility observations on invented interfaces.',
    },
    lead: {
      fr: 'Un carnet pédagogique de démonstration pour documenter les observations d’accessibilité sur des interfaces inventées.',
      en: 'An educational demonstration notebook for accessibility observations on invented interfaces.',
    },
    period: { start: { year: 2023, month: 2 }, end: { year: 2023, month: 10 } },
    client: { fr: 'Projet pédagogique fictif', en: 'Fictional learning project' },
    role: { fr: 'Design d’interface et prototypage', en: 'Interface design and prototyping' },
    place: { fr: 'Ville-Exemple — lieu fictif', en: 'Example Town — fictional location' },
    siteUrl: 'https://example.com/demos/accessibility-notebook',
    techs: ['html', 'css', 'javascript'],
    featured: false,
    position: 3,
    status: 'published',
    version: 1,
    article: {
      fr: doc(
        h2('Scénario fictif'),
        p(
          'Le carnet rassemble des observations synthétiques sur des formulaires et des menus inventés. Il ne contient aucun audit de client réel.',
        ),
        h2('Démarche'),
        p(
          'Chaque exemple associe une difficulté observable, une proposition et une méthode de vérification.',
        ),
        h2('Résultat de démonstration'),
        p('Les fiches sont imprimables et utilisables sans animation ni dépendance réseau.'),
        ul('Données entièrement fictives', 'Navigation au clavier'),
      ),
      en: doc(
        h2('Fictional scenario'),
        p(
          'The notebook gathers synthetic observations about invented forms and menus. It contains no actual client audit.',
        ),
        h2('Approach'),
        p('Each example links an observable difficulty, a proposal and a verification method.'),
        h2('Demonstration outcome'),
        p('Notes can be printed and used without animation or a network connection.'),
        ul('Entirely fictional data', 'Keyboard navigation'),
      ),
    },
    cover: null,
  },
];

/** Fictional education and employment, ordered within each timeline kind. */
export const SEED_TIMELINE: TimelineRow[] = [
  {
    id: 'visual-design-diploma',
    position: 0,
    kind: 'education',
    title: {
      fr: 'Diplôme de création visuelle, École des formes — fictive',
      en: 'Visual Design Diploma, School of Forms — fictional',
    },
    place: { fr: 'Ville-Exemple — lieu fictif', en: 'Example Town — fictional location' },
    description: {
      fr: 'Pratique de la typographie, de la composition et de l’édition.',
      en: 'Typography, composition and editorial practice.',
    },
    startYear: 2015,
    startMonth: 1,
    endYear: 2017,
    endMonth: 12,
    techs: [],
  },
  {
    id: 'interaction-design-course',
    position: 1,
    kind: 'education',
    title: {
      fr: 'Parcours design d’interaction, Institut des usages — fictif',
      en: 'Interaction Design Course, Institute of Uses — fictional',
    },
    place: { fr: 'Ville-Exemple — lieu fictif', en: 'Example Town — fictional location' },
    description: {
      fr: 'Prototypes, entretiens et architecture de l’information.',
      en: 'Prototypes, interviews and information architecture.',
    },
    startYear: 2018,
    startMonth: 1,
    endYear: 2019,
    endMonth: 12,
    techs: [],
  },
  {
    id: 'inclusive-design-workshop',
    position: 2,
    kind: 'education',
    title: {
      fr: 'Atelier de conception inclusive, Campus Démo',
      en: 'Inclusive Design Workshop, Demo Campus',
    },
    place: { fr: 'Ville-Exemple — lieu fictif', en: 'Example Town — fictional location' },
    description: {
      fr: 'Navigation au clavier, langage clair et tests de parcours.',
      en: 'Keyboard navigation, plain language and journey testing.',
    },
    startYear: 2020,
    startMonth: 1,
    endYear: 2020,
    endMonth: 12,
    techs: [],
  },
  {
    id: 'paper-lantern-studio',
    position: 0,
    kind: 'experience',
    title: {
      fr: 'Designer junior, Atelier Lanterne de papier — fictif',
      en: 'Junior Designer, Paper Lantern Studio — fictional',
    },
    place: { fr: 'Ville-Exemple — lieu fictif', en: 'Example Town — fictional location' },
    description: {
      fr: 'Maquettes éditoriales et prototypes de sites culturels imaginaires.',
      en: 'Editorial layouts and prototypes for imaginary cultural websites.',
    },
    startYear: 2017,
    startMonth: 1,
    endYear: 2019,
    endMonth: 12,
    techs: [],
  },
  {
    id: 'open-reading-collective',
    position: 1,
    kind: 'experience',
    title: {
      fr: 'Designer d’interfaces, Collectif Lecture ouverte — fictif',
      en: 'Interface Designer, Open Reading Collective — fictional',
    },
    place: { fr: 'Ville-Exemple — lieu fictif', en: 'Example Town — fictional location' },
    description: {
      fr: 'Exploration de catalogues et d’agendas avec des données synthétiques.',
      en: 'Catalogue and calendar exploration using synthetic data.',
    },
    startYear: 2020,
    startMonth: 1,
    endYear: 2022,
    endMonth: 12,
    techs: [],
  },
  {
    id: 'independent-interface-practice',
    position: 2,
    kind: 'experience',
    title: {
      fr: 'Conception indépendante — activité fictive',
      en: 'Independent Design — fictional practice',
    },
    place: { fr: 'Ville-Exemple — lieu fictif', en: 'Example Town — fictional location' },
    description: {
      fr: 'Prototypes accessibles pour des associations et services culturels inventés.',
      en: 'Accessible prototypes for invented associations and cultural services.',
    },
    startYear: 2023,
    startMonth: 1,
    endYear: 2025,
    endMonth: 12,
    techs: [],
  },
];

/** Demonstration skills for the fictional interface-design profile. */
export const SEED_SKILLS: SkillRow[] = [
  {
    id: 'front-end',
    domain: { fr: 'Interfaces', en: 'Interfaces' },
    techs: [
      { key: 'vue', language: null },
      { key: 'svelte', language: null },
      { key: 'typescript', language: null },
    ],
    usage: {
      fr: 'Prototypes de catalogues et de cartes éditoriales fictifs.',
      en: 'Prototypes of fictional catalogues and editorial maps.',
    },
    position: 0,
  },
  {
    id: 'back-end',
    domain: { fr: 'Données de démonstration', en: 'Demonstration data' },
    techs: [
      { key: 'nodejs', language: null },
      { key: 'sqlite', language: null },
    ],
    usage: {
      fr: 'Petites API locales et jeux de données synthétiques.',
      en: 'Small local APIs and synthetic datasets.',
    },
    position: 1,
  },
  {
    id: 'cms',
    domain: { fr: 'Publication', en: 'Publishing' },
    techs: [
      { key: 'html', language: null },
      { key: 'css', language: null },
    ],
    usage: {
      fr: 'Documents structurés et parcours de lecture accessibles.',
      en: 'Structured documents and accessible reading journeys.',
    },
    position: 2,
  },
  {
    id: 'outils',
    domain: { fr: 'Outils', en: 'Tools' },
    techs: [
      { key: 'figma', language: null },
      { key: 'git', language: null },
      { key: 'playwright', language: null },
    ],
    usage: {
      fr: 'Maquettes, versions et vérifications de navigation.',
      en: 'Mockups, versioning and navigation checks.',
    },
    position: 3,
  },
];

/** Reserved example links; these do not point to real social accounts. */
export const SEED_LINKS: ProfileLinksColumn = [
  { kind: 'email', url: 'mailto:morgan@example.com', label: 'Demo contact' },
  { kind: 'github', url: 'https://example.com/demo/code', label: 'Demo code profile' },
  { kind: 'linkedin', url: 'https://example.com/demo/profile', label: 'Demo professional profile' },
];

/** Illustrative legal documents; operators must replace them before publication. */
export const SEED_LEGAL_DOCUMENTS: (typeof legalDocuments.$inferInsert)[] = [
  { kind: 'notice', body: SEED_LEGAL_NOTICE, updatedAt: SEED_LEGAL_UPDATED_AT, version: 1 },
  { kind: 'privacy', body: SEED_PRIVACY_POLICY, updatedAt: SEED_LEGAL_UPDATED_AT, version: 1 },
];

/** Clearly fictional singleton profile for development and acceptance. */
export const SEED_PROFILE: ProfileRow = {
  id: 1,
  heroIntro: {
    fr: 'Morgan Exemple, personnage fictif de démonstration. Je conçois des interfaces accessibles pour des projets culturels imaginaires.',
    en: 'Morgan Exemple, a fictional demonstration persona. I design accessible interfaces for imaginary cultural projects.',
  },
  aboutStatement: {
    fr: 'Ce profil inventé illustre une démarche de conception attentive aux différents usages.',
    en: 'This invented profile illustrates a design approach attentive to different ways of using an interface.',
  },
  aboutLead: {
    fr: 'Dans ce scénario fictif, un parcours en création visuelle conduit Morgan vers le design d’interaction, puis vers des prototypes pour la lecture et les ateliers créatifs.',
    en: 'In this fictional scenario, a background in visual design leads Morgan into interaction design and then prototypes for reading and creative workshops.',
  },
  facts: [
    {
      label: { fr: 'Personnage', en: 'Persona' },
      value: { fr: 'Morgan Exemple — fictif', en: 'Morgan Exemple — fictional' },
    },
    {
      label: { fr: 'Lieu fictif', en: 'Fictional location' },
      value: { fr: 'Ville-Exemple', en: 'Example Town' },
    },
    {
      label: { fr: 'Activités inventées', en: 'Invented interests' },
      value: {
        fr: 'Reliure, gravure et carnets de voyage imaginaires',
        en: 'Bookbinding, printmaking and imaginary travel journals',
      },
    },
  ],
  links: SEED_LINKS,
};

/**
 * Function seedContent
 *
 * @description
 * Replaces profile, legal documents and collection contents with the initial seed in one database
 * transaction. The first run creates revision 1; replaying the seed increments the existing revision.
 *
 * @param {ContentDatabase} db - Database handle used for the seed transaction.
 * @returns {Promise<void>} Completion after all seed rows are written.
 */
export async function seedContent(db: ContentDatabase): Promise<void> {
  await db.transaction(async (tx: ContentTransaction): Promise<void> => {
    await tx.delete(projects);
    await tx.delete(timelineEntries);
    await tx.delete(skillGroups);
    await tx.delete(profile);
    await tx.delete(legalDocuments);
    await tx.insert(projects).values(SEED_PROJECTS);
    await tx.insert(timelineEntries).values(SEED_TIMELINE);
    // The lists were replaced: a reorder read before the seed must fail.
    for (const kind of ['education', 'experience'] as const) {
      await tx
        .insert(timelineLists)
        .values({ kind, version: 1 })
        .onConflictDoUpdate({
          target: timelineLists.kind,
          set: { version: sql`${timelineLists.version} + 1` },
        });
    }
    await tx.insert(skillGroups).values(SEED_SKILLS);
    await tx.insert(profile).values(SEED_PROFILE);
    await tx.insert(legalDocuments).values(SEED_LEGAL_DOCUMENTS);
    await tx
      .insert(contentRevision)
      .values({ id: 1, revision: 1 })
      .onConflictDoUpdate({
        target: contentRevision.id,
        set: { revision: sql`${contentRevision.revision} + 1` },
      });
  });
}
