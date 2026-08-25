-- ORBIMOD — SUPABASE INITIAL DATABASE SCHEMA MIGRATION
-- Tables for User Profiles, Custom Deck Layouts, Moderated Channels History, and Audit Logs

-- 1. Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  username TEXT,
  avatar_url TEXT,
  twitch_login TEXT,
  kick_username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. User Layouts & Panel Preferences Table
CREATE TABLE IF NOT EXISTS public.user_layouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  layout_type TEXT DEFAULT 'grid-4',
  channels JSONB DEFAULT '[]'::jsonb,
  active_widgets JSONB DEFAULT '[]'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

-- 3. Moderated Channels History Table
CREATE TABLE IF NOT EXISTS public.channel_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  channel_id TEXT NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  role TEXT DEFAULT 'mod',
  avatar TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, channel_id)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_history ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies
CREATE POLICY "Permitir acceso a propio perfil" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Permitir acceso a propios layouts" ON public.user_layouts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Permitir acceso a propio historial" ON public.channel_history
  FOR ALL USING (auth.uid() = user_id);

-- 6. Trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  
  INSERT INTO public.user_layouts (user_id, layout_type, channels, active_widgets, preferences)
  VALUES (
    NEW.id,
    'grid-4',
    '[]'::jsonb,
    '["quick-notes", "audit-log", "user-inspector"]'::jsonb,
    '{"theme": "cyber-dark", "notifications": true}'::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
