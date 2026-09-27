DROP TRIGGER IF EXISTS on_auth_user_created_operator ON auth.users;
DROP FUNCTION IF EXISTS public.handle_first_operator() CASCADE;