CREATE TABLE "content"."media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"has_small" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"unlinked_at" timestamp with time zone,
	CONSTRAINT "media_sha256_unique" UNIQUE("sha256")
);
--> statement-breakpoint
ALTER TABLE "content"."projects" ADD COLUMN "cover" jsonb;