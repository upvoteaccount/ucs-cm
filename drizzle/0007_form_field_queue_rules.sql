DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_field_refs_id_form'
    ) THEN
        ALTER TABLE "form_field_references" ADD CONSTRAINT "uq_field_refs_id_form" UNIQUE ("id", "form_id");
    END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "form_field_queue_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solution_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"field_reference_id" uuid NOT NULL,
	"queue_id" uuid NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_editable" boolean DEFAULT true NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_queue_rules_field_same_form'
    ) THEN
        ALTER TABLE "form_field_queue_rules" ADD CONSTRAINT "fk_queue_rules_field_same_form" FOREIGN KEY ("field_reference_id", "form_id") REFERENCES "form_field_references"("id", "form_id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_queue_rules_queue_same_sol'
    ) THEN
        ALTER TABLE "form_field_queue_rules" ADD CONSTRAINT "fk_queue_rules_queue_same_sol" FOREIGN KEY ("queue_id", "solution_id") REFERENCES "solution_queues"("id", "solution_id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_queue_rules_form_same_sol'
    ) THEN
        ALTER TABLE "form_field_queue_rules" ADD CONSTRAINT "fk_queue_rules_form_same_sol" FOREIGN KEY ("form_id", "solution_id") REFERENCES "solution_forms"("id", "solution_id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_queue_rules_field_queue" ON "form_field_queue_rules" USING btree ("field_reference_id", "queue_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_queue_rules_form" ON "form_field_queue_rules" USING btree ("form_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_queue_rules_queue" ON "form_field_queue_rules" USING btree ("queue_id");
