-- Recreate audit_log if it was dropped (so deny is recorded and pending list excludes denied users).
CREATE TABLE IF NOT EXISTS public.audit_log (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT NOT NULL,
    target_user_id BIGINT NOT NULL REFERENCES public."user"(user_id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT INSERT, SELECT ON public.audit_log TO service_role;
