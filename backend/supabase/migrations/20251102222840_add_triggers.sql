-- Timestamps auto-update convenience (updated_at)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tag_updated_at ON tag;
CREATE TRIGGER trg_tag_updated_at
BEFORE UPDATE ON tag
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_exercise_updated_at ON exercise;
CREATE TRIGGER trg_exercise_updated_at
BEFORE UPDATE ON exercise
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_module_updated_at ON module;
CREATE TRIGGER trg_module_updated_at
BEFORE UPDATE ON module
FOR EACH ROW EXECUTE FUNCTION set_updated_at();