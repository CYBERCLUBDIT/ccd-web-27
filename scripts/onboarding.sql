-- Run once before deploying the dashboard/onboarding update.
-- Existing profile fields are deliberately not treated as completed onboarding.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
