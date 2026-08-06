CREATE TABLE "choice_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solution_id" uuid NOT NULL,
	"key" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_choice_lists_id_sol" UNIQUE("id","solution_id")
);
--> statement-breakpoint
CREATE TABLE "choice_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"choice_list_id" uuid NOT NULL,
	"key" varchar(64) NOT NULL,
	"label" varchar(255) NOT NULL,
	"display_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_choice_options_order" CHECK (display_order > 0)
);
--> statement-breakpoint
CREATE TABLE "form_field_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solution_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"control_type" varchar(32) NOT NULL,
	"display_order" integer NOT NULL,
	"visible_override" boolean,
	"enabled_override" boolean,
	"editable_override" boolean,
	"required_override" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_field_ref_control_type" CHECK (control_type IN ('TEXT_INPUT', 'TEXTAREA', 'DROPDOWN', 'RADIO', 'CHECKBOX', 'DATE_PICKER', 'DATETIME_PICKER', 'USER_PICKER', 'NUMBER_INPUT')),
	CONSTRAINT "chk_field_refs_order" CHECK (display_order > 0)
);
--> statement-breakpoint
CREATE TABLE "form_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"tab_id" uuid NOT NULL,
	"section_key" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_sections_id_form" UNIQUE("id","form_id"),
	CONSTRAINT "chk_form_sections_order" CHECK (display_order > 0)
);
--> statement-breakpoint
CREATE TABLE "form_tabs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"tab_key" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tabs_id_form" UNIQUE("id","form_id"),
	CONSTRAINT "chk_form_tabs_order" CHECK (display_order > 0)
);
--> statement-breakpoint
CREATE TABLE "solution_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solution_id" uuid NOT NULL,
	"form_key" varchar(64) DEFAULT 'initial_form' NOT NULL,
	"name" varchar(255) DEFAULT 'Initial Form' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_forms_id_sol" UNIQUE("id","solution_id"),
	CONSTRAINT "chk_initial_form_key" CHECK (form_key = 'initial_form')
);
--> statement-breakpoint
CREATE TABLE "solution_properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solution_id" uuid NOT NULL,
	"local_symbolic_name" varchar(53) NOT NULL,
	"generated_technical_name" varchar(64) NOT NULL,
	"label" varchar(255) NOT NULL,
	"stored_data_type" varchar(32) NOT NULL,
	"format_preset" varchar(32) DEFAULT 'NONE' NOT NULL,
	"choice_list_id" uuid,
	"cardinality" varchar(16) DEFAULT 'SINGLE' NOT NULL,
	"default_value" text,
	"help_text" text,
	"is_sensitive" boolean DEFAULT false NOT NULL,
	"validation_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_properties_id_sol" UNIQUE("id","solution_id"),
	CONSTRAINT "chk_prop_stored_data_type" CHECK (stored_data_type IN ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'DATETIME', 'USER_REFERENCE')),
	CONSTRAINT "chk_prop_format_preset" CHECK (format_preset IN ('NONE', 'EMAIL', 'PHONE')),
	CONSTRAINT "chk_prop_cardinality" CHECK (cardinality IN ('SINGLE', 'MULTIPLE')),
	CONSTRAINT "chk_prop_local_name" CHECK (local_symbolic_name ~ '^[a-z][a-z0-9_]{0,52}$'),
	CONSTRAINT "chk_prop_tech_name_len" CHECK (length(generated_technical_name) <= 64)
);
--> statement-breakpoint
CREATE TABLE "solutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"solution_prefix" varchar(10) NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"status" varchar(32) DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_solutions_prefix" CHECK (solution_prefix ~ '^[A-Z][A-Z0-9]{1,9}$'),
	CONSTRAINT "chk_solutions_status" CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);
--> statement-breakpoint
ALTER TABLE "choice_lists" ADD CONSTRAINT "choice_lists_solution_id_solutions_id_fk" FOREIGN KEY ("solution_id") REFERENCES "public"."solutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "choice_options" ADD CONSTRAINT "choice_options_choice_list_id_choice_lists_id_fk" FOREIGN KEY ("choice_list_id") REFERENCES "public"."choice_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_field_references" ADD CONSTRAINT "fk_field_refs_form_same_sol" FOREIGN KEY ("form_id","solution_id") REFERENCES "public"."solution_forms"("id","solution_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_field_references" ADD CONSTRAINT "fk_field_refs_prop_same_sol" FOREIGN KEY ("property_id","solution_id") REFERENCES "public"."solution_properties"("id","solution_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_field_references" ADD CONSTRAINT "fk_field_refs_section_same_form" FOREIGN KEY ("section_id","form_id") REFERENCES "public"."form_sections"("id","form_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_sections" ADD CONSTRAINT "form_sections_form_id_solution_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."solution_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_sections" ADD CONSTRAINT "fk_sections_tab_same_form" FOREIGN KEY ("tab_id","form_id") REFERENCES "public"."form_tabs"("id","form_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_tabs" ADD CONSTRAINT "form_tabs_form_id_solution_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."solution_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_forms" ADD CONSTRAINT "solution_forms_solution_id_solutions_id_fk" FOREIGN KEY ("solution_id") REFERENCES "public"."solutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_properties" ADD CONSTRAINT "solution_properties_solution_id_solutions_id_fk" FOREIGN KEY ("solution_id") REFERENCES "public"."solutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_properties" ADD CONSTRAINT "fk_props_choice_list_same_sol" FOREIGN KEY ("choice_list_id","solution_id") REFERENCES "public"."choice_lists"("id","solution_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solutions" ADD CONSTRAINT "solutions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_choice_lists_solution_key" ON "choice_lists" USING btree ("solution_id","key");--> statement-breakpoint
CREATE INDEX "idx_choice_lists_solution" ON "choice_lists" USING btree ("solution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_choice_options_list_key" ON "choice_options" USING btree ("choice_list_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_choice_options_list_order" ON "choice_options" USING btree ("choice_list_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_field_refs_form_property" ON "form_field_references" USING btree ("form_id","property_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_field_refs_section_order" ON "form_field_references" USING btree ("section_id","display_order");--> statement-breakpoint
CREATE INDEX "idx_field_refs_property" ON "form_field_references" USING btree ("property_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sections_tab_key" ON "form_sections" USING btree ("tab_id","section_key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sections_tab_order" ON "form_sections" USING btree ("tab_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tabs_form_key" ON "form_tabs" USING btree ("form_id","tab_key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tabs_form_order" ON "form_tabs" USING btree ("form_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_forms_solution_key" ON "solution_forms" USING btree ("solution_id","form_key");--> statement-breakpoint
CREATE INDEX "idx_forms_solution" ON "solution_forms" USING btree ("solution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_properties_solution_local_name" ON "solution_properties" USING btree ("solution_id","local_symbolic_name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_properties_solution_tech_name" ON "solution_properties" USING btree ("solution_id","generated_technical_name");--> statement-breakpoint
CREATE INDEX "idx_properties_solution" ON "solution_properties" USING btree ("solution_id");--> statement-breakpoint
CREATE INDEX "idx_properties_choice_list" ON "solution_properties" USING btree ("choice_list_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_solutions_org_prefix" ON "solutions" USING btree ("organisation_id","solution_prefix");--> statement-breakpoint
CREATE INDEX "idx_solutions_org" ON "solutions" USING btree ("organisation_id");