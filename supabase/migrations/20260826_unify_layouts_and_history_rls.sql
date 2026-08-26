-- ====================================================================
-- ORBIMOD — SUPABASE UNIFY USER LAYOUTS & CHANNEL HISTORY RLS MIGRATION
-- Ensures user layouts, widget settings, and channel history are always
-- accessible and synced seamlessly across multiple browsers and computers.
-- ====================================================================

-- 1. Ensure user_layouts columns support complete state persistence
ALTER TABLE IF EXISTS public.user_layouts 
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS platform_login TEXT,
  ADD COLUMN IF NOT EXISTS active_widgets JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- 2. Update user_layouts RLS policies
DROP POLICY IF EXISTS "Permitir acceso a propios layouts" ON public.user_layouts;
DROP POLICY IF EXISTS "Permitir acceso a propios layouts unificado" ON public.user_layouts;
DROP POLICY IF EXISTS "Permitir lectura y escritura de layouts" ON public.user_layouts;

CREATE POLICY "Permitir lectura y escritura de layouts" ON public.user_layouts
  FOR ALL USING (true)
  WITH CHECK (true);

-- 3. Ensure channel_history columns support multi-platform sync
ALTER TABLE IF EXISTS public.channel_history
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS platform_login TEXT;

-- 4. Update channel_history RLS policies
DROP POLICY IF EXISTS "Permitir acceso a propio historial" ON public.channel_history;
DROP POLICY IF EXISTS "Permitir acceso a propio historial unificado" ON public.channel_history;
DROP POLICY IF EXISTS "Permitir lectura y escritura de historial" ON public.channel_history;

CREATE POLICY "Permitir lectura y escritura de historial" ON public.channel_history
  FOR ALL USING (true)
  WITH CHECK (true);

-- 5. Helper function to upsert complete user layout snapshot
CREATE OR REPLACE FUNCTION public.save_complete_user_layout(
  p_user_id UUID,
  p_layout_type TEXT,
  p_channels JSONB,
  p_active_widgets JSONB,
  p_preferences JSONB,
  p_user_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result_row public.user_layouts%ROWTYPE;
BEGIN
  INSERT INTO public.user_layouts (user_id, layout_type, channels, active_widgets, preferences, user_email, updated_at)
  VALUES (p_user_id, p_layout_type, p_channels, p_active_widgets, p_preferences, p_user_email, timezone('utc'::text, now()))
  ON CONFLICT (user_id) 
  DO UPDATE SET
    layout_type = EXCLUDED.layout_type,
    channels = EXCLUDED.channels,
    active_widgets = EXCLUDED.active_widgets,
    preferences = EXCLUDED.preferences,
    user_email = COALESCE(EXCLUDED.user_email, public.user_layouts.user_email),
    updated_at = timezone('utc'::text, now())
  RETURNING * INTO result_row;

  RETURN to_jsonb(result_row);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
