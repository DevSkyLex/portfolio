CREATE TABLE "content"."seo_refresh" (
	"id" integer PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "content"."seo_reports" (
	"source" text NOT NULL,
	"range" text NOT NULL,
	"data" jsonb,
	"fetched_at" timestamp with time zone,
	"failure" jsonb,
	"attempted_at" timestamp with time zone NOT NULL,
	CONSTRAINT "seo_reports_source_range_pk" PRIMARY KEY("source","range")
);
