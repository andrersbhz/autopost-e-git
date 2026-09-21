-- 1. Create the user_roles system
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- 2. Grants
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 3. RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Security Definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Policies for user_roles
CREATE POLICY "Users can see their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Add some system-wide stats or audit views if needed
-- (The existing tables articles, user_blogs, etc already have RLS)

-- 7. Grant admin access to existing tables via policies
-- We'll need to update policies for all sensitive tables to allow admins.
-- This usually involves adding: OR public.has_role(auth.uid(), 'admin') to the USING clause.

-- Note: The user mentioned 'andrers.bhz@gmail.com'. 
-- We can't easily find their UUID in a migration without knowing it, 
-- but we can provide a script/RPC to elevate them or the user can do it via code.

COMMIT;

-- 8. Assign admin role to the specified user
-- UUID: 1c45fe95-636f-4118-a4b6-1f36e2c69c8e (andrers.bhz@gmail.com)
INSERT INTO public.user_roles (user_id, role)
VALUES ('1c45fe95-636f-4118-a4b6-1f36e2c69c8e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 9. Allow admins to see all articles, blogs, etc.
DROP POLICY IF EXISTS "Admins can see all articles" ON public.articles;
CREATE POLICY "Admins can see all articles" ON public.articles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can see all blogs" ON public.user_blogs;
CREATE POLICY "Admins can see all blogs" ON public.user_blogs
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can see all sales" ON public.sales;
CREATE POLICY "Admins can see all sales" ON public.sales
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can see all user_settings" ON public.user_settings;
CREATE POLICY "Admins can see all user_settings" ON public.user_settings
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
