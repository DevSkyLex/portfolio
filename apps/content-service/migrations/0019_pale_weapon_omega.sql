ALTER TABLE "content"."projects" ADD COLUMN "kind" text DEFAULT 'project' NOT NULL;--> statement-breakpoint
ALTER TABLE "content"."projects" ADD COLUMN "taxonomy" jsonb;