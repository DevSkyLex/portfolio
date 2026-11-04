ALTER TABLE "content"."projects" ALTER COLUMN "period" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "content"."projects" DROP COLUMN "period_label";