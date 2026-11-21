import { RETENTION_YEARS } from '@vfortin/contact-domain';
import type { ContactDatabase } from '@internal/contact-adapters-out/lib/persistence/database/contact-database';
import { messages } from '@internal/contact-adapters-out/lib/persistence/schema/contact.schema';

/**
 * Interface ContactMessageFixture
 * @interface ContactMessageFixture
 *
 * @description
 * One inbox message of the fixtures, dated relative to the loading time.
 */
interface ContactMessageFixture {
  // #region Properties
  readonly id: string;
  readonly name: string;
  readonly company: string | null;
  readonly email: string;
  readonly subject: 'project' | 'job' | 'other';
  readonly body: string;
  readonly locale: 'fr' | 'en';
  readonly status: 'received' | 'read' | 'archived';
  /** Hours before the loading time. */
  readonly hoursAgo: number;
  // #endregion
}

/**
 * Constant CONTACT_MESSAGE_FIXTURES
 *
 * @description
 * Inbox of the development fixtures (D55): every subject, both languages, unread, read and archived
 * messages, with and without company. Addresses use the reserved `.test` domain.
 *
 * @type {readonly ContactMessageFixture[]}
 */
export const CONTACT_MESSAGE_FIXTURES: readonly ContactMessageFixture[] = [
  {
    id: '00000000-0000-4000-8000-00000000c001',
    name: 'Camille Martin',
    company: 'Atelier Loire',
    email: 'camille.martin@atelier-loire.test',
    subject: 'project',
    body: 'Bonjour, nous cherchons à refondre le site de notre atelier (catalogue, prise de rendez-vous). Seriez-vous disponible au printemps pour en discuter ?',
    locale: 'fr',
    status: 'received',
    hoursAgo: 3,
  },
  {
    id: '00000000-0000-4000-8000-00000000c002',
    name: 'Jordan Lee',
    company: 'Northwind Labs',
    email: 'jordan.lee@northwind.test',
    subject: 'job',
    body: 'Hi Valentin, we are hiring a full-stack developer (Angular, NestJS) for a remote-friendly team. Would you be open to a short call next week?',
    locale: 'en',
    status: 'received',
    hoursAgo: 26,
  },
  {
    id: '00000000-0000-4000-8000-00000000c003',
    name: 'Inès Durand',
    company: null,
    email: 'ines.durand@exemple.test',
    subject: 'other',
    body: 'Merci pour l’article sur Movah, très clair. Quelle bibliothèque utilisez-vous pour la synchronisation hors ligne ?',
    locale: 'fr',
    status: 'read',
    hoursAgo: 72,
  },
  {
    id: '00000000-0000-4000-8000-00000000c004',
    name: 'Thomas Bernard',
    company: 'Coopérative Val de Cher',
    email: 'thomas.bernard@valdecher.test',
    subject: 'project',
    body: 'Notre coopérative souhaite une application mobile pour suivre les livraisons des producteurs. Pouvez-vous nous faire une estimation ?',
    locale: 'fr',
    status: 'read',
    hoursAgo: 120,
  },
  {
    id: '00000000-0000-4000-8000-00000000c005',
    name: 'Sofia Rossi',
    company: 'Studio Aria',
    email: 'sofia.rossi@studio-aria.test',
    subject: 'job',
    body: 'Hello, our studio is looking for a freelancer for a three-month Symfony mission starting in January.',
    locale: 'en',
    status: 'archived',
    hoursAgo: 340,
  },
  {
    id: '00000000-0000-4000-8000-00000000c006',
    name: 'Lucas Petit',
    company: null,
    email: 'lucas.petit@exemple.test',
    subject: 'other',
    body: 'Bonjour, je suis étudiant en BUT informatique à Blois et j’aimerais échanger sur votre parcours.',
    locale: 'fr',
    status: 'archived',
    hoursAgo: 720,
  },
];

/**
 * Function loadContactFixtures
 *
 * @description
 * Writes the fixture messages, or resets them to their fixture state (status, dates, version) when
 * they exist, without notification job: fixtures send no mail. Other messages are left as they are.
 *
 * @param {ContactDatabase} db - Contact database.
 * @param {Date} now - Loading time, from which the messages are dated.
 * @returns {Promise<number>} Number of fixture messages.
 */
export async function loadContactFixtures(db: ContactDatabase, now: Date): Promise<number> {
  for (const fixture of CONTACT_MESSAGE_FIXTURES) {
    const receivedAt: Date = new Date(now.getTime() - fixture.hoursAgo * 3_600_000);
    const purgeAt: Date = new Date(receivedAt);
    purgeAt.setUTCFullYear(purgeAt.getUTCFullYear() + RETENTION_YEARS);
    const { hoursAgo: _hoursAgo, ...row } = fixture;
    const values: typeof messages.$inferInsert = { ...row, receivedAt, purgeAt, version: 1 };
    await db
      .insert(messages)
      .values(values)
      .onConflictDoUpdate({
        target: messages.id,
        set: { status: row.status, receivedAt, purgeAt, version: 1 },
      });
  }
  return CONTACT_MESSAGE_FIXTURES.length;
}
