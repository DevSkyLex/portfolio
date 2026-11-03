CREATE TABLE "identity"."refresh_token_families" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "identity"."refresh_token_families" ADD CONSTRAINT "refresh_token_families_account_id_admin_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."admin_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refresh_token_families_account_idx" ON "identity"."refresh_token_families" USING btree ("account_id");--> statement-breakpoint
-- Families of the sessions opened before this migration (a revoked token revoked its whole family).
INSERT INTO "identity"."refresh_token_families" ("id", "account_id", "created_at", "revoked_at")
SELECT "family_id", min("account_id"), min("expires_at") - interval '7 days', max("revoked_at")
FROM "identity"."refresh_tokens" GROUP BY "family_id";--> statement-breakpoint
ALTER TABLE "identity"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_family_id_refresh_token_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "identity"."refresh_token_families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refresh_tokens_account_idx" ON "identity"."refresh_tokens" USING btree ("account_id");