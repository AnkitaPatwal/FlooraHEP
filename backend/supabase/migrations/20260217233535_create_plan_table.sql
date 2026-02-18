-- ATH-245: Plans, Modules, and Exercises
-- Append this block to dev_seed.sql
-- DDL is idempotent (IF NOT EXISTS/ON CONFLICT DO NOTHING).
-- All INSERTs are idempotent and match the existing admin/video seed rows.


-- 1. DDL — plan
CREATE TABLE IF NOT EXISTS public.plan (
  plan_id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title               TEXT        NOT NULL,
  description         TEXT        NOT NULL,
  created_by_admin_id BIGINT      NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plan_created_by_admin_fk
    FOREIGN KEY (created_by_admin_id) REFERENCES public.admin(user_id) ON DELETE RESTRICT
);


-- 2. DDL — plan_module  (junction: plan → module, ordered)
CREATE TABLE IF NOT EXISTS public.plan_module (
  plan_module_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plan_id        BIGINT  NOT NULL,
  module_id      BIGINT  NOT NULL,
  order_index    INTEGER NOT NULL CHECK (order_index > 0),
  CONSTRAINT plan_module_plan_fk
    FOREIGN KEY (plan_id)   REFERENCES public.plan(plan_id)     ON DELETE CASCADE,
  CONSTRAINT plan_module_module_fk
    FOREIGN KEY (module_id) REFERENCES public.module(module_id) ON DELETE RESTRICT,
  CONSTRAINT plan_module_unique
    UNIQUE (plan_id, module_id)
);