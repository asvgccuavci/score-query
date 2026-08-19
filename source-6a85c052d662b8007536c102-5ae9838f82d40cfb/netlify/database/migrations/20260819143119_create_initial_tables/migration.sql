CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"ip" text NOT NULL,
	"action" text NOT NULL,
	"target" text,
	"status" text NOT NULL,
	"details" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "ip_rate_limits" (
	"id" serial PRIMARY KEY,
	"ip" text NOT NULL UNIQUE,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt" timestamp DEFAULT now() NOT NULL,
	"blocked_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" text PRIMARY KEY,
	"student_id" text NOT NULL,
	"name" text NOT NULL,
	"class_name" text NOT NULL,
	"password" text NOT NULL,
	"courses_json" text NOT NULL,
	"query_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY,
	"key" text NOT NULL UNIQUE,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
