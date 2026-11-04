CREATE TABLE "identity"."oauth_authorization_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"account_id" text NOT NULL,
	"client_id" text NOT NULL,
	"grant_id" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"scopes" jsonb NOT NULL,
	"resource" text NOT NULL,
	"code_challenge" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"family_id" text,
	CONSTRAINT "oauth_authorization_codes_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
CREATE TABLE "identity"."oauth_authorization_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"session_id" text NOT NULL,
	"client_id" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"scopes" jsonb NOT NULL,
	"resource" text NOT NULL,
	"state" text,
	"code_challenge" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "identity"."oauth_clients" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"name" text,
	"client_uri" text,
	"logo_uri" text,
	"logo" text,
	"logo_fetched_at" timestamp with time zone,
	"redirect_uris" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"metadata_expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "identity"."oauth_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"client_id" text NOT NULL,
	"scopes" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "identity"."oauth_refresh_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"account_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"rotated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "oauth_refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "identity"."oauth_token_families" (
	"id" text PRIMARY KEY NOT NULL,
	"grant_id" text NOT NULL,
	"account_id" text NOT NULL,
	"client_id" text NOT NULL,
	"resource" text NOT NULL,
	"scopes" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text
);
--> statement-breakpoint
ALTER TABLE "identity"."oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_account_id_admin_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."admin_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_client_id_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "identity"."oauth_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_grant_id_oauth_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "identity"."oauth_grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."oauth_authorization_requests" ADD CONSTRAINT "oauth_authorization_requests_account_id_admin_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."admin_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."oauth_authorization_requests" ADD CONSTRAINT "oauth_authorization_requests_client_id_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "identity"."oauth_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."oauth_grants" ADD CONSTRAINT "oauth_grants_account_id_admin_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."admin_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."oauth_grants" ADD CONSTRAINT "oauth_grants_client_id_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "identity"."oauth_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_family_id_oauth_token_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "identity"."oauth_token_families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_account_id_admin_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."admin_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."oauth_token_families" ADD CONSTRAINT "oauth_token_families_grant_id_oauth_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "identity"."oauth_grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."oauth_token_families" ADD CONSTRAINT "oauth_token_families_account_id_admin_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."admin_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."oauth_token_families" ADD CONSTRAINT "oauth_token_families_client_id_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "identity"."oauth_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "oauth_authorization_codes_expires_idx" ON "identity"."oauth_authorization_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "oauth_authorization_requests_expires_idx" ON "identity"."oauth_authorization_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "oauth_clients_kind_created_idx" ON "identity"."oauth_clients" USING btree ("kind","created_at");--> statement-breakpoint
CREATE INDEX "oauth_grants_account_idx" ON "identity"."oauth_grants" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_grants_active_idx" ON "identity"."oauth_grants" USING btree ("account_id","client_id") WHERE "identity"."oauth_grants"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "oauth_refresh_tokens_family_idx" ON "identity"."oauth_refresh_tokens" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "oauth_token_families_grant_idx" ON "identity"."oauth_token_families" USING btree ("grant_id");