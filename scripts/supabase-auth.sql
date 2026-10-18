-- Apply with a privileged Supabase migration connection, not the runtime role.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS supabase_user_id uuid UNIQUE;
ALTER TABLE public.users ADD CONSTRAINT users_supabase_identity_fk
  FOREIGN KEY (supabase_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
