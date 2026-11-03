CREATE TABLE "identity"."login_challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"remember" boolean NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "login_challenges_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "identity"."trusted_devices" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "trusted_devices_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "identity"."refresh_token_families" ADD COLUMN "persistent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "identity"."login_challenges" ADD CONSTRAINT "login_challenges_account_id_admin_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."admin_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."trusted_devices" ADD CONSTRAINT "trusted_devices_account_id_admin_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."admin_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "login_challenges_account_idx" ON "identity"."login_challenges" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "trusted_devices_account_idx" ON "identity"."trusted_devices" USING btree ("account_id");