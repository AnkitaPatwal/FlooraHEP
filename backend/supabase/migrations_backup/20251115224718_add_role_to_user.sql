CREATE TYPE user_role AS ENUM ('patient', 'admin');

ALTER TABLE "user"
ADD COLUMN role user_role DEFAULT 'patient';
