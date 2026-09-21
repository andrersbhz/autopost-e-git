ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS gemini_model text DEFAULT 'gemini-1.5-flash',
ADD COLUMN IF NOT EXISTS openai_model text DEFAULT 'gpt-4o-mini',
ADD COLUMN IF NOT EXISTS groq_model text DEFAULT 'llama-3.3-70b-versatile',
ADD COLUMN IF NOT EXISTS azure_openai_model text;