CREATE TABLE "content"."timeline_lists" (
	"kind" text PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content"."timeline_entries" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "content"."timeline_entries" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;