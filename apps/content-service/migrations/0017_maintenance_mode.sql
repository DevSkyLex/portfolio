CREATE TABLE "content"."maintenance" (
	"id" integer PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"message" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
