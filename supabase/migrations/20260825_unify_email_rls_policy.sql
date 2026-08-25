-- ====================================================================
-- ORBIMOD — SUPABASE UNIFY GOOGLE & EMAIL RLS POLICY
-- Allows users who sign in via Google OAuth OR via Email/Password 
-- with the same email address to read and synchronize linked accounts.
-- ====================================================================

-- 1. Drop existing strict ID-only policy
DROP POLICY IF EXISTS "Permitir acceso a propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Permitir acceso a propio perfil o mismo email" ON public.profiles;

-- 2. Create Unified Email & ID RLS Policy
CREATE POLICY "Permitir acceso a propio perfil o mismo email" ON public.profiles
  FOR ALL USING (
    auth.uid() = id OR 
    (email IS NOT NULL AND LOWER(email) = LOWER(auth.jwt() ->> 'email'))
  );

-- 3. Also allow unauthenticated lookup of linked accounts for direct OAuth linking
DROP POLICY IF EXISTS "Permitir lectura publica de perfiles para vinculacion" ON public.profiles;
CREATE POLICY "Permitir lectura publica de perfiles para vinculacion" ON public.profiles
  FOR SELECT USING (true);
