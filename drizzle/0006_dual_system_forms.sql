ALTER TABLE "solution_forms" DROP CONSTRAINT IF EXISTS "chk_initial_form_key";
--> statement-breakpoint
ALTER TABLE "solution_forms" ADD COLUMN IF NOT EXISTS "form_type" varchar(32);
--> statement-breakpoint
UPDATE "solution_forms"
SET "form_type" = 'CASE_VIEW',
    "form_key" = 'case_view',
    "name" = 'Case View Form'
WHERE "form_key" = 'initial_form' OR "form_type" IS NULL;
--> statement-breakpoint
DO $$
DECLARE
    sol RECORD;
    new_form_id UUID;
BEGIN
    FOR sol IN SELECT id FROM "solutions" LOOP
        IF NOT EXISTS (SELECT 1 FROM "solution_forms" WHERE "solution_id" = sol.id AND "form_type" = 'ADD_CASE') THEN
            INSERT INTO "solution_forms" ("id", "solution_id", "form_type", "form_key", "name", "created_at", "updated_at")
            VALUES (gen_random_uuid(), sol.id, 'ADD_CASE', 'add_case', 'Add Case Form', NOW(), NOW())
            RETURNING "id" INTO new_form_id;

            INSERT INTO "form_tabs" ("id", "form_id", "tab_key", "title", "display_order", "created_at", "updated_at")
            VALUES (gen_random_uuid(), new_form_id, 'tab_1', 'Default Tab', 1, NOW(), NOW());
        END IF;
    END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE "solution_forms" ALTER COLUMN "form_type" SET NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_solution_form_type'
    ) THEN
        ALTER TABLE "solution_forms" ADD CONSTRAINT "chk_solution_form_type" CHECK (form_type IN ('ADD_CASE', 'CASE_VIEW', 'CUSTOM'));
    END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_forms_solution_type" ON "solution_forms" USING btree ("solution_id", "form_type");
