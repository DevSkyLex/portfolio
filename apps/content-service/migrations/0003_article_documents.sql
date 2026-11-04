-- D40: converts the seven-section articles into one rich document per language.
-- Each non-empty section becomes a level-2 heading followed by its paragraphs; "workList" becomes a
-- bullet list after the "work" paragraphs; "captions" is dropped. An English document is written only
-- when the old article had English text, and its missing paragraphs fall back to the French text (a
-- published project was complete, so only drafts can have gaps). Rows already converted have no
-- "context" key, so replaying this migration changes nothing.
WITH sec(key, ord, fr, en) AS (
  VALUES
    ('context', 1, 'Contexte', 'Context'),
    ('work', 2, 'Ce que j’ai fait', 'What I did'),
    ('choices', 3, 'Choix techniques', 'Technical choices'),
    ('result', 4, 'Résultat', 'Outcome'),
    ('lessons', 5, 'Ce que je retiens', 'What I learned')
),
src AS (
  SELECT p.id, l.lang, p.article AS a
  FROM content.projects p
  CROSS JOIN (VALUES ('fr'), ('en')) AS l(lang)
  WHERE p.article ? 'context'
    AND (l.lang = 'fr' OR jsonb_path_exists(p.article - 'captions', '$.*[*].en'))
),
blk AS (
  SELECT s.id, s.lang, c.ord, 0 AS k, 0::bigint AS n,
    jsonb_build_object(
      'type', 'heading',
      'attrs', '{"level":2}'::jsonb,
      'content', jsonb_build_array(jsonb_build_object(
        'type', 'text', 'text', CASE s.lang WHEN 'fr' THEN c.fr ELSE c.en END
      ))
    ) AS node
  FROM src s
  JOIN sec c
    ON jsonb_array_length(COALESCE(s.a -> c.key, '[]'::jsonb)) > 0
    OR (c.key = 'work' AND jsonb_array_length(COALESCE(s.a -> 'workList', '[]'::jsonb)) > 0)
  UNION ALL
  SELECT s.id, s.lang, c.ord, 1, e.n,
    jsonb_build_object(
      'type', 'paragraph',
      'content', jsonb_build_array(jsonb_build_object(
        'type', 'text',
        'text', COALESCE(NULLIF(btrim(e.i ->> s.lang), ''), e.i ->> 'fr')
      ))
    )
  FROM src s
  JOIN sec c ON true
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.a -> c.key, '[]'::jsonb)) WITH ORDINALITY AS e(i, n)
  UNION ALL
  SELECT s.id, s.lang, 2, 2, 0,
    jsonb_build_object(
      'type', 'bulletList',
      'content', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'type', 'listItem',
            'content', jsonb_build_array(jsonb_build_object(
              'type', 'paragraph',
              'content', jsonb_build_array(jsonb_build_object(
                'type', 'text',
                'text', COALESCE(NULLIF(btrim(w.i ->> s.lang), ''), w.i ->> 'fr')
              ))
            ))
          )
          ORDER BY w.n
        )
        FROM jsonb_array_elements(s.a -> 'workList') WITH ORDINALITY AS w(i, n)
      )
    )
  FROM src s
  WHERE jsonb_array_length(COALESCE(s.a -> 'workList', '[]'::jsonb)) > 0
),
doc AS (
  SELECT id, jsonb_object_agg(lang, jsonb_build_object('type', 'doc', 'content', nodes)) AS article
  FROM (
    SELECT id, lang, jsonb_agg(node ORDER BY ord, k, n) AS nodes
    FROM blk
    GROUP BY id, lang
  ) AS g
  GROUP BY id
)
UPDATE content.projects p
SET article = '{"fr":{"type":"doc","content":[{"type":"paragraph"}]}}'::jsonb
  || COALESCE((SELECT d.article FROM doc d WHERE d.id = p.id), '{}'::jsonb)
WHERE p.article ? 'context';
