CREATE TABLE public.instagram_accounts_direct (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_accounts_direct TO authenticated;
GRANT ALL ON public.instagram_accounts_direct TO service_role;

ALTER TABLE public.instagram_accounts_direct ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own instagram accounts direct"
ON public.instagram_accounts_direct
FOR ALL
USING (auth.uid() = user_id);

CREATE TRIGGER update_instagram_accounts_direct_updated_at
BEFORE UPDATE ON public.instagram_accounts_direct
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();