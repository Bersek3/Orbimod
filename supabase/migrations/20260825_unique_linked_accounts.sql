-- ====================================================================
-- ORBIMOD — SUPABASE UNIQUE LINKED ACCOUNTS SECURITY MIGRATION
-- Prevents duplicate linking: 1 Twitch / 1 Kick account can only be
-- linked to exactly 1 master email profile at a time.
-- ====================================================================

-- 1. Enforce unique lowercase Twitch login per user profile
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_unique_twitch_login 
  ON public.profiles(LOWER(twitch_login)) 
  WHERE twitch_login IS NOT NULL AND twitch_login != '';

-- 2. Enforce unique lowercase Kick username per user profile
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_unique_kick_username 
  ON public.profiles(LOWER(kick_username)) 
  WHERE kick_username IS NOT NULL AND kick_username != '';

-- 3. Function to check account availability before linking
CREATE OR REPLACE FUNCTION public.check_linked_account_conflict(
  p_platform TEXT,
  p_username TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  has_conflict BOOLEAN,
  owner_email TEXT,
  owner_username TEXT
) AS $$
BEGIN
  IF p_platform = 'twitch' THEN
    RETURN QUERY
    SELECT 
      TRUE,
      profiles.email,
      profiles.username
    FROM public.profiles
    WHERE LOWER(profiles.twitch_login) = LOWER(p_username)
      AND profiles.id != p_user_id
    LIMIT 1;
  ELSIF p_platform = 'kick' THEN
    RETURN QUERY
    SELECT 
      TRUE,
      profiles.email,
      profiles.username
    FROM public.profiles
    WHERE LOWER(profiles.kick_username) = LOWER(p_username)
      AND profiles.id != p_user_id
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
