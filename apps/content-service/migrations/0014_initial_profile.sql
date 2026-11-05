-- A fresh installation needs a profile before its first public build or admin edit. Keep existing
-- profiles and all collections untouched. The migration-created legal text names the mail provider.
WITH created_profile AS (
  INSERT INTO content.profile (id, hero_intro, about_statement, about_lead, facts, links, version)
  VALUES (
    1,
    '{"fr":"Portfolio de Valentin Fortin.","en":"Valentin Fortin''s portfolio."}'::jsonb,
    '{"fr":"À propos","en":"About"}'::jsonb,
    '{"fr":"Bienvenue sur mon portfolio.","en":"Welcome to my portfolio."}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    1
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
UPDATE content.legal_documents
SET body = replace(
  replace(
    body::text,
    'Ils transitent par l''hébergeur, OVH SAS, en France, qui assure aussi l''envoi de l''e-mail de notification.',
    'Ils transitent par l''hébergeur OVH SAS et par Brevo pour l''envoi de l''e-mail de notification.'
  ),
  'They pass through the hosting provider, OVH SAS, in France, which also sends the notification email.',
  'They pass through the hosting provider OVH SAS and through Brevo for the notification email.'
)::jsonb
WHERE kind = 'privacy' AND version = 1 AND EXISTS (SELECT 1 FROM created_profile);
