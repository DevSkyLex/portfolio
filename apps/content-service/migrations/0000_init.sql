CREATE SCHEMA IF NOT EXISTS "content";
--> statement-breakpoint
CREATE TABLE "content"."content_revision" (
	"id" integer PRIMARY KEY NOT NULL,
	"revision" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."profile" (
	"id" integer PRIMARY KEY NOT NULL,
	"hero_intro" jsonb NOT NULL,
	"about_statement" jsonb NOT NULL,
	"about_lead" jsonb NOT NULL,
	"facts" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."projects" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" jsonb NOT NULL,
	"summary" jsonb NOT NULL,
	"lead" jsonb NOT NULL,
	"period_label" jsonb NOT NULL,
	"client" jsonb NOT NULL,
	"role" jsonb NOT NULL,
	"place" jsonb NOT NULL,
	"site_url" text,
	"techs" jsonb NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"article" jsonb NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content"."skill_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"domain" jsonb NOT NULL,
	"techs" jsonb NOT NULL,
	"usage" jsonb NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."timeline_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" jsonb NOT NULL,
	"place" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"start_year" integer NOT NULL,
	"start_month" integer NOT NULL,
	"end_year" integer,
	"end_month" integer,
	"techs" jsonb NOT NULL
);
