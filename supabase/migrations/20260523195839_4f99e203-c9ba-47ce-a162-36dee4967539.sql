-- Create authors table
CREATE TABLE public.authors (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    role TEXT,
    category TEXT, -- The category this author is assigned to
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add author_id to articles
ALTER TABLE public.articles 
ADD COLUMN author_id UUID REFERENCES public.authors(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;

-- Policies for authors
CREATE POLICY "Users can manage their own authors" 
ON public.authors 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Authors are publicly viewable" 
ON public.authors 
FOR SELECT 
USING (true);

-- Trigger for updated_at on authors
CREATE TRIGGER update_authors_updated_at
BEFORE UPDATE ON public.authors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
