
CREATE TABLE public.terminals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  country_code TEXT NOT NULL DEFAULT '+55',
  ddd TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own terminals" ON public.terminals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own terminals" ON public.terminals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own terminals" ON public.terminals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own terminals" ON public.terminals FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_terminals_updated_at
  BEFORE UPDATE ON public.terminals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
