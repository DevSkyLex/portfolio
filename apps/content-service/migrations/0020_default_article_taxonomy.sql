UPDATE "content"."projects"
SET "taxonomy" = '{"category":{"key":"projects","label":{"fr":"Projets","en":"Projects"}},"tags":[]}'::jsonb
WHERE "kind" = 'project'
  AND ("taxonomy" IS NULL OR "taxonomy" = '{"category":null,"tags":[]}'::jsonb);
