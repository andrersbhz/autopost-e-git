DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
        CREATE TYPE public.subscription_plan AS ENUM ('basico', 'avancado', 'enterprise');
    END IF;
END $$;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_plan public.subscription_plan DEFAULT 'basico',
ADD COLUMN IF NOT EXISTS blog_limit INTEGER DEFAULT 1;

UPDATE public.profiles SET blog_limit = 1 WHERE subscription_plan = 'basico';
UPDATE public.profiles SET blog_limit = 10 WHERE subscription_plan = 'avancado';
UPDATE public.profiles SET blog_limit = 50 WHERE subscription_plan = 'enterprise';

CREATE OR REPLACE FUNCTION public.get_admin_profiles()
RETURNS TABLE (
    id UUID,
    email TEXT,
    subscription_plan public.subscription_plan,
    blog_limit INTEGER,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;
    
    RETURN QUERY 
    SELECT p.id, u.email::TEXT, p.subscription_plan, p.blog_limit, u.created_at
    FROM public.profiles p
    JOIN auth.users u ON p.id = u.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_profiles() TO authenticated;
