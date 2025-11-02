CREATE TABLE IF NOT EXISTS "user" (
  user_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email            TEXT    NOT NULL UNIQUE,
  password         TEXT    NOT NULL,
  fname            TEXT    NOT NULL,
  lname            TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS admin (
  user_id          BIGINT PRIMARY KEY,
  CONSTRAINT admin_user_fk
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS photo (
  photo_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bucket           TEXT    NOT NULL,
  object_key       TEXT    NOT NULL,
  original_filename TEXT   NOT NULL,
  mime_type        TEXT    NOT NULL,
  byte_size        BIGINT  NOT NULL CHECK (byte_size >= 0),
  width            INTEGER NOT NULL CHECK (width  > 0),
  height           INTEGER NOT NULL CHECK (height > 0),
  uploader_user_id BIGINT  NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT photo_uploader_user_fk
    FOREIGN KEY (uploader_user_id) REFERENCES "user"(user_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS video (
  video_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bucket           TEXT    NOT NULL,
  object_key       TEXT    NOT NULL,
  original_filename TEXT   NOT NULL,
  mime_type        TEXT    NOT NULL,
  byte_size        BIGINT  NOT NULL CHECK (byte_size >= 0),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
  width            INTEGER NOT NULL CHECK (width  > 0),
  height           INTEGER NOT NULL CHECK (height > 0),
  uploader_user_id BIGINT  NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT video_uploader_user_fk
    FOREIGN KEY (uploader_user_id) REFERENCES "user"(user_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS patient (
  user_id          BIGINT PRIMARY KEY,
  profile_photo_id BIGINT NULL,
  CONSTRAINT patient_user_fk
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
  CONSTRAINT patient_profile_photo_fk
    FOREIGN KEY (profile_photo_id) REFERENCES photo(photo_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tag (
  tag_id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name               TEXT       NOT NULL UNIQUE,
  is_active          BOOLEAN    NOT NULL DEFAULT TRUE,
  created_by_admin_id BIGINT    NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tag_created_by_admin_fk
    FOREIGN KEY (created_by_admin_id) REFERENCES admin(user_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS exercise (
  exercise_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title               TEXT       NOT NULL,
  description         TEXT       NOT NULL,
  default_sets        INTEGER    NULL CHECK (default_sets IS NULL OR default_sets > 0),
  default_reps        INTEGER    NULL CHECK (default_reps IS NULL OR default_reps > 0),
  video_id            BIGINT     NULL,
  thumbnail_photo_id  BIGINT     NULL,
  created_by_admin_id BIGINT     NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT exercise_video_fk
    FOREIGN KEY (video_id) REFERENCES video(video_id) ON DELETE SET NULL,
  CONSTRAINT exercise_thumb_fk
    FOREIGN KEY (thumbnail_photo_id) REFERENCES photo(photo_id) ON DELETE SET NULL,
  CONSTRAINT exercise_created_by_admin_fk
    FOREIGN KEY (created_by_admin_id) REFERENCES admin(user_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS exercise_tag (
  exercise_id BIGINT NOT NULL,
  tag_id      BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT exercise_tag_pk PRIMARY KEY (exercise_id, tag_id),
  CONSTRAINT exercise_tag_exercise_fk
    FOREIGN KEY (exercise_id) REFERENCES exercise(exercise_id) ON DELETE CASCADE,
  CONSTRAINT exercise_tag_tag_fk
    FOREIGN KEY (tag_id) REFERENCES tag(tag_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS module (
  module_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title               TEXT       NOT NULL,
  description         TEXT       NOT NULL,
  session_number      INTEGER    NOT NULL CHECK (session_number > 0),
  available_date      DATE       NULL,
  created_by_admin_id BIGINT     NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT module_created_by_admin_fk
    FOREIGN KEY (created_by_admin_id) REFERENCES admin(user_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS module_exercise (
  module_exercise_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  module_id          BIGINT  NOT NULL,
  exercise_id        BIGINT  NOT NULL,
  order_index        INTEGER NOT NULL CHECK (order_index > 0),
  sets_override      INTEGER NULL CHECK (sets_override IS NULL OR sets_override > 0),
  reps_override      INTEGER NULL CHECK (reps_override IS NULL OR reps_override > 0),
  CONSTRAINT module_exercise_module_fk
    FOREIGN KEY (module_id) REFERENCES module(module_id) ON DELETE CASCADE,
  CONSTRAINT module_exercise_exercise_fk
    FOREIGN KEY (exercise_id) REFERENCES exercise(exercise_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS user_module (
  user_module_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id             BIGINT NOT NULL,
  module_id           BIGINT NOT NULL,
  assigned_by_admin_id BIGINT NOT NULL,
  available_at        TIMESTAMPTZ NULL,
  notes               TEXT NULL,
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_module_user_fk
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
  CONSTRAINT user_module_module_fk
    FOREIGN KEY (module_id) REFERENCES module(module_id) ON DELETE CASCADE,
  CONSTRAINT user_module_assigned_by_admin_fk
    FOREIGN KEY (assigned_by_admin_id) REFERENCES admin(user_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS user_exercise (
  user_exercise_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                     BIGINT NOT NULL,
  exercise_id                 BIGINT NOT NULL,
  source_user_module_id       BIGINT NULL,
  source_module_exercise_id   BIGINT NULL,
  num_sets_override           INTEGER NULL CHECK (num_sets_override IS NULL OR num_sets_override > 0),
  num_reps_override           INTEGER NULL CHECK (num_reps_override IS NULL OR num_reps_override > 0),
  order_index                 INTEGER NULL CHECK (order_index IS NULL OR order_index > 0),
  notes                       TEXT NULL,
  assigned_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_exercise_user_fk
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
  CONSTRAINT user_exercise_exercise_fk
    FOREIGN KEY (exercise_id) REFERENCES exercise(exercise_id) ON DELETE RESTRICT,
  CONSTRAINT user_exercise_src_um_fk
    FOREIGN KEY (source_user_module_id) REFERENCES user_module(user_module_id) ON DELETE SET NULL,
  CONSTRAINT user_exercise_src_me_fk
    FOREIGN KEY (source_module_exercise_id) REFERENCES module_exercise(module_exercise_id) ON DELETE SET NULL
);


-- “status” index (ERD uses is_active on TAG)
CREATE INDEX IF NOT EXISTS idx_tag_is_active ON tag(is_active);

-- user_id indexes (beyond PKs)
CREATE INDEX IF NOT EXISTS idx_photo_uploader_user_id   ON photo(uploader_user_id);
CREATE INDEX IF NOT EXISTS idx_video_uploader_user_id   ON video(uploader_user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_user_id      ON user_module(user_id);
CREATE INDEX IF NOT EXISTS idx_user_exercise_user_id    ON user_exercise(user_id);

-- common FK lookups
CREATE INDEX IF NOT EXISTS idx_module_exercise_module_id   ON module_exercise(module_id);
CREATE INDEX IF NOT EXISTS idx_module_exercise_exercise_id ON module_exercise(exercise_id);
CREATE INDEX IF NOT EXISTS idx_user_module_module_id       ON user_module(module_id);
CREATE INDEX IF NOT EXISTS idx_user_exercise_exercise_id   ON user_exercise(exercise_id);