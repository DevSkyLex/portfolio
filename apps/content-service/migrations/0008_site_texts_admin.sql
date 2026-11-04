CREATE TABLE "content"."legal_documents" (
	"kind" text PRIMARY KEY NOT NULL,
	"body" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content"."profile" ADD COLUMN "links" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "content"."profile" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;