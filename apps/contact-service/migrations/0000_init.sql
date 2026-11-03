CREATE SCHEMA IF NOT EXISTS "contact";
--> statement-breakpoint
CREATE TABLE "contact"."messages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"locale" text NOT NULL,
	"status" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"purge_at" timestamp with time zone NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact"."notification_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"status" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone NOT NULL,
	"claimed_until" timestamp with time zone,
	"last_error" text,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "contact"."rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact"."notification_jobs" ADD CONSTRAINT "notification_jobs_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "contact"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_purge_at_idx" ON "contact"."messages" USING btree ("purge_at");--> statement-breakpoint
CREATE INDEX "notification_jobs_due_idx" ON "contact"."notification_jobs" USING btree ("status","next_attempt_at");