CREATE TABLE "content"."site_build_requests" (
	"revision" integer PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"next_attempt_at" timestamp with time zone NOT NULL,
	"claimed_until" timestamp with time zone,
	"dispatched_at" timestamp with time zone,
	"last_error" text
);
