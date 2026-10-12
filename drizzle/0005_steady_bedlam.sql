CREATE TABLE "queue_user_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solution_id" uuid NOT NULL,
	"queue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solution_queues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solution_id" uuid NOT NULL,
	"queue_key" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_queues_id_sol" UNIQUE("id","solution_id"),
	CONSTRAINT "chk_queue_key_format" CHECK (queue_key ~ '^[A-Z][A-Z0-9_]{0,63}$')
);
--> statement-breakpoint
ALTER TABLE "solution_properties" DROP CONSTRAINT "chk_prop_local_name";--> statement-breakpoint
ALTER TABLE "queue_user_assignments" ADD CONSTRAINT "queue_user_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_user_assignments" ADD CONSTRAINT "fk_queue_user_assign_queue_sol" FOREIGN KEY ("queue_id","solution_id") REFERENCES "public"."solution_queues"("id","solution_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_queues" ADD CONSTRAINT "solution_queues_solution_id_solutions_id_fk" FOREIGN KEY ("solution_id") REFERENCES "public"."solutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_queue_user_assignment" ON "queue_user_assignments" USING btree ("queue_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_queue_assignments_queue" ON "queue_user_assignments" USING btree ("queue_id");--> statement-breakpoint
CREATE INDEX "idx_queue_assignments_user" ON "queue_user_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_queues_solution_key" ON "solution_queues" USING btree ("solution_id","queue_key");--> statement-breakpoint
CREATE INDEX "idx_queues_solution" ON "solution_queues" USING btree ("solution_id");--> statement-breakpoint
ALTER TABLE "solution_properties" ADD CONSTRAINT "chk_prop_local_name" CHECK (local_symbolic_name ~ '^[a-zA-Z][a-zA-Z0-9_]{0,52}$');