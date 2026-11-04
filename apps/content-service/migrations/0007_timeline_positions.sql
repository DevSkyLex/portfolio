-- Timeline administration: numbers the existing entries of each kind from 0 in chronological order
-- (start, then end with an ongoing entry last, then id), the order the public timeline already showed,
-- and creates the list version row of both kinds. Replaying it renumbers the same way and keeps the
-- existing list versions.
WITH ranked AS (
  SELECT
    id,
    (row_number() OVER (
      PARTITION BY kind
      ORDER BY start_year, start_month, end_year NULLS LAST, end_month NULLS LAST, id
    ) - 1)::integer AS rank
  FROM content.timeline_entries
)
UPDATE content.timeline_entries t
SET position = ranked.rank
FROM ranked
WHERE t.id = ranked.id;
--> statement-breakpoint
INSERT INTO content.timeline_lists (kind, version)
VALUES ('education', 1), ('experience', 1)
ON CONFLICT (kind) DO NOTHING;
