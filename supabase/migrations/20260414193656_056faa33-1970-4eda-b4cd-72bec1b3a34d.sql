
-- Table for phone chips
CREATE TABLE public.phone_chips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ddd TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  full_number TEXT GENERATED ALWAYS AS (ddd || phone_number) STORED,
  status TEXT NOT NULL DEFAULT 'pending',
  whatsapp_active BOOLEAN DEFAULT false,
  activated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_chips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chips" ON public.phone_chips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chips" ON public.phone_chips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chips" ON public.phone_chips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chips" ON public.phone_chips FOR DELETE USING (auth.uid() = user_id);

-- Table for warmup numbers
CREATE TABLE public.warmup_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ddd TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  full_number TEXT GENERATED ALWAYS AS (ddd || phone_number) STORED,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  last_message_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.warmup_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own warmup numbers" ON public.warmup_numbers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own warmup numbers" ON public.warmup_numbers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own warmup numbers" ON public.warmup_numbers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own warmup numbers" ON public.warmup_numbers FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_phone_chips_updated_at BEFORE UPDATE ON public.phone_chips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_warmup_numbers_updated_at BEFORE UPDATE ON public.warmup_numbers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
