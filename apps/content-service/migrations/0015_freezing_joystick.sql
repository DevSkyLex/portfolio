CREATE TABLE "content"."publication_state" (
	"id" integer PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"base_revision" integer DEFAULT 0 NOT NULL,
	"frozen" jsonb
);
