-- D46: writes the structured period of each project from its free French label, before 0012 drops
-- the label. The label is read case- and accent-insensitively and split on a dash (em, en or hyphen):
-- each side takes its first four-digit year and its first French month name; a start without a year
-- takes the end's (« Mars — avril 2023 »), the year before when its month comes later (« Novembre —
-- février 2024 »); no end side makes the end the start (« Mars 2023 », « 2023 »); « Depuis » at the
-- start, or an end side reading « aujourd'hui », « présent » or « en cours », makes it ongoing. A label
-- without any year becomes ongoing from the current year (its month kept, if any): the label the
-- service then writes changes, so check such a project after the migration. Years are clamped to
-- 1990–2100 and reversed bounds swapped, so every row rehydrates. Only rows without a period are
-- written, and the block does nothing once 0012 has dropped the label column: replaying it is safe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'content' AND table_name = 'projects' AND column_name = 'period_label'
  ) THEN
    RETURN;
  END IF;
  UPDATE content.projects p
  SET period = jsonb_build_object(
    'start', jsonb_build_object(
      'year', CASE WHEN r.reversed THEN r.ey ELSE r.sy END,
      'month', CASE WHEN r.reversed THEN r.em ELSE r.sm END
    ),
    'end', CASE WHEN r.ongoing THEN 'null'::jsonb ELSE jsonb_build_object(
      'year', CASE WHEN r.reversed THEN r.sy ELSE r.ey END,
      'month', CASE WHEN r.reversed THEN r.sm ELSE r.em END
    ) END
  )
  FROM (
    SELECT b.id, b.ongoing, b.sy, b.sm, b.ey, b.em,
      NOT b.ongoing AND (b.ey < b.sy OR (b.ey = b.sy AND b.em < b.sm)) AS reversed
    FROM (
      SELECT a.id,
        a.ongoing OR (a.head_year IS NULL AND a.tail_year IS NULL) AS ongoing,
        GREATEST(1990, LEAST(2100, COALESCE(
          a.head_year,
          a.tail_year - CASE WHEN a.head_month > a.tail_month THEN 1 ELSE 0 END,
          extract(year FROM now())::int
        ))) AS sy,
        a.head_month AS sm,
        GREATEST(1990, LEAST(2100, COALESCE(
          CASE WHEN a.has_tail THEN a.tail_year END,
          a.head_year,
          extract(year FROM now())::int
        ))) AS ey,
        CASE WHEN a.has_tail THEN a.tail_month ELSE a.head_month END AS em
      FROM (
        SELECT s.id,
          s.label ~ '^\s*depuis\M' OR COALESCE(s.tail ~ '^(aujourd|present|en cours)', false) AS ongoing,
          s.tail IS NOT NULL AS has_tail,
          (regexp_match(s.head, '\m(\d{4})\M'))[1]::int AS head_year,
          (regexp_match(s.tail, '\m(\d{4})\M'))[1]::int AS tail_year,
          array_position(s.months, (regexp_match(s.head, s.pattern))[1])::int AS head_month,
          array_position(s.months, (regexp_match(s.tail, s.pattern))[1])::int AS tail_month
        FROM (
          SELECT t.id, t.label,
            (regexp_split_to_array(t.label, '\s*[—–-]\s*'))[1] AS head,
            (regexp_split_to_array(t.label, '\s*[—–-]\s*'))[2] AS tail,
            ARRAY['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout',
              'septembre', 'octobre', 'novembre', 'decembre'] AS months,
            '\m(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\M'
              AS pattern
          FROM (
            SELECT id, btrim(translate(lower(period_label ->> 'fr'),
              'ÉÈÊËÀÂÄÎÏÔÖÛÜÙÇéèêëàâäîïôöûüùç',
              'eeeeaaaiioouuuceeeeaaaiioouuuc')) AS label
            FROM content.projects
            WHERE period IS NULL
          ) t
        ) s
      ) a
    ) b
  ) r
  WHERE p.id = r.id AND p.period IS NULL;
END
$$;
