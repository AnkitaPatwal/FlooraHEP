-- PROFILES TABLE (BIGINT PK -> "user")
CREATE TABLE IF NOT EXISTS public.profiles (
  id               BIGINT PRIMARY KEY
                   REFERENCES "user"(user_id) ON DELETE CASCADE,
  email            TEXT NULL,
  display_name     TEXT NULL,
  avatar_url       TEXT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_id_idx ON public.profiles(id);

CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profiles_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user_from_public_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.user_id, NEW.email)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_public_user_created ON public."user";
CREATE TRIGGER trg_on_public_user_created
AFTER INSERT ON public."user"
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_from_public_user();

INSERT INTO public.profiles (id, email)
SELECT u.user_id, u.email
FROM public."user" u
LEFT JOIN public.profiles p ON p.id = u.user_id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
