import type { Project } from '@vfortin/content-domain';
import { sql } from 'drizzle-orm';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type ContentDatabaseHandle,
  migrateContentDatabase,
  openContentDatabase,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import { DrizzleProjectRepository } from '@internal/content-adapters-out/lib/persistence/repositories/content-admin/drizzle-content-admin.repositories';
import { projects } from '@internal/content-adapters-out/lib/persistence/schema/content.schema';

/**
 * Constant MIGRATIONS
 *
 * @description
 * Absolute content-service migration directory.
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../apps/content-service/migrations', import.meta.url),
);

/**
 * Constant CONVERSION
 *
 * @description
 * Tag of the migration converting the seven-section articles.
 */
const CONVERSION: string = '0003_article_documents';

/**
 * Function migrationsBefore
 *
 * @description
 * Copies the migrations preceding the conversion into a directory with a truncated journal, so old
 * rows can be written before the conversion runs.
 *
 * @param {string} root - Directory receiving the copy.
 * @returns {string} Migration directory without the conversion.
 */
function migrationsBefore(root: string): string {
  const journal: { entries: { tag: string }[] } = JSON.parse(
    readFileSync(join(MIGRATIONS, 'meta', '_journal.json'), 'utf8'),
  );
  const index: number = journal.entries.findIndex(
    (entry: { tag: string }): boolean => entry.tag === CONVERSION,
  );
  const entries: { tag: string }[] = journal.entries.slice(0, index);
  mkdirSync(join(root, 'meta'), { recursive: true });
  for (const entry of entries) {
    copyFileSync(join(MIGRATIONS, `${entry.tag}.sql`), join(root, `${entry.tag}.sql`));
  }
  writeFileSync(join(root, 'meta', '_journal.json'), JSON.stringify({ ...journal, entries }));
  return root;
}

/**
 * Function insertOld
 *
 * @description
 * Inserts a project row in the format stored before D40.
 *
 * @param {ContentDatabaseHandle} handle - Database handle.
 * @param {string} id - Project identifier and slug.
 * @param {Record<string, unknown>} article - Seven-section article.
 * @returns {Promise<void>} Completion after the insert.
 */
async function insertOld(
  handle: ContentDatabaseHandle,
  id: string,
  article: Record<string, unknown>,
): Promise<void> {
  const text: string = JSON.stringify({ fr: 'Texte', en: 'Text' });
  await handle.db.execute(sql`
    insert into content.projects
      (id, slug, title, summary, lead, period_label, client, role, place, techs, position, status, article)
    values (${id}, ${id}, ${text}::jsonb, ${text}::jsonb, ${text}::jsonb, ${text}::jsonb,
      ${text}::jsonb, ${text}::jsonb, ${text}::jsonb, '[]'::jsonb, 0, 'draft',
      ${JSON.stringify(article)}::jsonb)
  `);
}

/**
 * Function heading
 *
 * @description
 * Expected level-2 heading node.
 *
 * @param {string} text - Heading text.
 * @returns {object} Heading node.
 */
const heading = (text: string): object => ({
  type: 'heading',
  attrs: { level: 2 },
  content: [{ type: 'text', text }],
});

/**
 * Function paragraph
 *
 * @description
 * Expected paragraph node.
 *
 * @param {string} text - Paragraph text.
 * @returns {object} Paragraph node.
 */
const paragraph = (text: string): object => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

describe(`${CONVERSION} migration (Postgres via PGlite)`, (): void => {
  let root: string;
  let handle: ContentDatabaseHandle;

  beforeEach(async (): Promise<void> => {
    root = mkdtempSync(join(tmpdir(), 'content-migration-'));
    handle = await openContentDatabase('pglite:memory');
    await migrateContentDatabase(handle, migrationsBefore(root));
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
    rmSync(root, { recursive: true, force: true });
  });

  it('converts each section to a heading and its paragraphs, once', async (): Promise<void> => {
    await insertOld(handle, 'complete', {
      context: [
        { fr: 'Contexte 1', en: 'Context 1' },
        { fr: 'Contexte 2', en: 'Context 2' },
      ],
      work: [{ fr: 'Travail', en: 'Work' }],
      workList: [
        { fr: 'Point 1', en: 'Item 1' },
        { fr: 'Point 2', en: 'Item 2' },
      ],
      choices: [{ fr: 'Choix', en: 'Choice' }],
      result: [{ fr: 'Résultat', en: 'Outcome' }],
      lessons: [{ fr: 'Leçon', en: 'Lesson' }],
      captions: [{ fr: 'Légende', en: 'Caption' }],
    });
    await insertOld(handle, 'french', {
      context: [{ fr: 'Seul contexte' }],
      work: [],
      workList: [{ fr: 'Seul point' }],
      choices: [],
      result: [],
      lessons: [],
      captions: [{ fr: 'Légende', en: 'Caption' }],
    });
    await insertOld(handle, 'partial', {
      context: [{ fr: 'Contexte', en: 'Context' }],
      work: [{ fr: 'Travail' }],
      workList: [],
      choices: [],
      result: [{ fr: 'Résultat', en: '  ' }],
      lessons: [],
      captions: [],
    });
    await insertOld(handle, 'empty', {
      context: [],
      work: [],
      workList: [],
      choices: [],
      result: [],
      lessons: [],
      captions: [],
    });
    await migrateContentDatabase(handle, MIGRATIONS);

    const articles = async (): Promise<Record<string, unknown>> =>
      Object.fromEntries(
        (await handle.db.select({ id: projects.id, article: projects.article }).from(projects)).map(
          (row: { id: string; article: unknown }): [string, unknown] => [row.id, row.article],
        ),
      );
    const converted: Record<string, unknown> = await articles();
    const list = (...items: string[]): object => ({
      type: 'bulletList',
      content: items.map((item: string): object => ({
        type: 'listItem',
        content: [paragraph(item)],
      })),
    });
    expect(converted['complete']).toEqual({
      fr: {
        type: 'doc',
        content: [
          heading('Contexte'),
          paragraph('Contexte 1'),
          paragraph('Contexte 2'),
          heading('Ce que j’ai fait'),
          paragraph('Travail'),
          list('Point 1', 'Point 2'),
          heading('Choix techniques'),
          paragraph('Choix'),
          heading('Résultat'),
          paragraph('Résultat'),
          heading('Ce que je retiens'),
          paragraph('Leçon'),
        ],
      },
      en: {
        type: 'doc',
        content: [
          heading('Context'),
          paragraph('Context 1'),
          paragraph('Context 2'),
          heading('What I did'),
          paragraph('Work'),
          list('Item 1', 'Item 2'),
          heading('Technical choices'),
          paragraph('Choice'),
          heading('Outcome'),
          paragraph('Outcome'),
          heading('What I learned'),
          paragraph('Lesson'),
        ],
      },
    });
    // English captions alone do not create an English document; an empty section has no heading.
    expect(converted['french']).toEqual({
      fr: {
        type: 'doc',
        content: [
          heading('Contexte'),
          paragraph('Seul contexte'),
          heading('Ce que j’ai fait'),
          list('Seul point'),
        ],
      },
    });
    // Missing English paragraphs of a draft fall back to the French text.
    expect(converted['partial']).toEqual({
      fr: {
        type: 'doc',
        content: [
          heading('Contexte'),
          paragraph('Contexte'),
          heading('Ce que j’ai fait'),
          paragraph('Travail'),
          heading('Résultat'),
          paragraph('Résultat'),
        ],
      },
      en: {
        type: 'doc',
        content: [
          heading('Context'),
          paragraph('Context'),
          heading('What I did'),
          paragraph('Travail'),
          heading('Outcome'),
          paragraph('Résultat'),
        ],
      },
    });
    expect(converted['empty']).toEqual({ fr: { type: 'doc', content: [{ type: 'paragraph' }] } });

    // Replaying the conversion leaves converted rows unchanged.
    await handle.db.execute(sql.raw(readFileSync(join(MIGRATIONS, `${CONVERSION}.sql`), 'utf8')));
    expect(await articles()).toEqual(converted);

    // The converted rows rehydrate into the aggregate, without cover.
    const project: Project | null = await new DrizzleProjectRepository(handle.db).get('partial');
    expect(project?.missingFor(['fr', 'en'])).toEqual([]);
    expect(project?.snapshot().cover).toBeNull();
    const french: Project | null = await new DrizzleProjectRepository(handle.db).get('french');
    expect(french?.missingFor(['fr', 'en'])).toEqual(['article.en']);
  });
});
