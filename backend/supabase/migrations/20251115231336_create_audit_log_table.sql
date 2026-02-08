CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    target_user_id BIGINT NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
