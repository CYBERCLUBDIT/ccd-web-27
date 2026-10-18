CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
 email text NOT NULL UNIQUE, registration_number text UNIQUE, phone text,
 course text NOT NULL DEFAULT '', study_year text NOT NULL DEFAULT '',
 password_hash text, role text NOT NULL DEFAULT 'member' CHECK(role IN ('member','admin')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz
);
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS password_tokens(token_hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS content (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK(kind IN ('event','news','resource','gallery','challenge','leader','testimonial')),
 title text NOT NULL, description text NOT NULL DEFAULT '', body text NOT NULL DEFAULT '', category text NOT NULL DEFAULT '',
 image_url text NOT NULL DEFAULT '', external_url text NOT NULL DEFAULT '', event_date timestamptz,
 location text NOT NULL DEFAULT '', published boolean NOT NULL DEFAULT false,
 created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS attendance(event_id uuid REFERENCES content(id) ON DELETE CASCADE,user_id uuid REFERENCES users(id) ON DELETE CASCADE,attended boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(event_id,user_id));
CREATE TABLE IF NOT EXISTS messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,email text NOT NULL,message text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS login_limits(key text PRIMARY KEY,attempts integer NOT NULL DEFAULT 1,window_start timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_log(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_id uuid REFERENCES users(id),action text NOT NULL,target_id uuid,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS reported_totals(metric text PRIMARY KEY CHECK(metric IN ('members','events','workshops','ctfs','attendance')),value integer NOT NULL CHECK(value>=0),lower_bound boolean NOT NULL DEFAULT false,source text NOT NULL,recorded_at timestamptz NOT NULL DEFAULT now());
INSERT INTO reported_totals(metric,value,lower_bound,source) VALUES
('members',300,true,'Club owner supplied total'),('events',5,false,'Club owner supplied total'),('workshops',5,false,'Club owner supplied total'),('ctfs',100,true,'Club owner supplied total'),('attendance',500,true,'Club owner supplied total') ON CONFLICT(metric) DO NOTHING;

DO $$ BEGIN IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='program') AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='course') THEN ALTER TABLE users RENAME COLUMN program TO course; END IF; END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_user_id uuid UNIQUE;

-- Completion is recorded only after verified students submit both onboarding forms.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
