CREATE TABLE "content"."faq_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"question" jsonb NOT NULL,
	"answer" jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."faq_list" (
	"id" integer PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
