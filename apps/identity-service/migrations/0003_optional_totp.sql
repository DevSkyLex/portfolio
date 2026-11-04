ALTER TABLE "identity"."admin_accounts" ALTER COLUMN "totp_secret" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "identity"."admin_accounts" ADD COLUMN "pending_totp_secret" text;