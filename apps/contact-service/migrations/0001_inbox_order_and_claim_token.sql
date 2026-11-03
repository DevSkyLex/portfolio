ALTER TABLE "contact"."notification_jobs" ADD COLUMN "claim_token" text;--> statement-breakpoint
CREATE INDEX "messages_received_idx" ON "contact"."messages" USING btree ("received_at","id");--> statement-breakpoint
CREATE INDEX "messages_status_received_idx" ON "contact"."messages" USING btree ("status","received_at","id");--> statement-breakpoint
CREATE INDEX "notification_jobs_message_idx" ON "contact"."notification_jobs" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "rate_limits_expires_at_idx" ON "contact"."rate_limits" USING btree ("expires_at");