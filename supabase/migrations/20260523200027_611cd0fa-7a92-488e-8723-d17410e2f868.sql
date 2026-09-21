CREATE OR REPLACE FUNCTION public.assign_author_by_category()
RETURNS TRIGGER AS $$
DECLARE
    found_author_id UUID;
BEGIN
    -- Only try to assign if not already explicitly set (or to override)
    -- Here we prioritize the category-based assignment
    SELECT id INTO found_author_id 
    FROM public.authors 
    WHERE category = NEW.category 
    AND user_id = NEW.user_id 
    LIMIT 1;

    IF found_author_id IS NOT NULL THEN
        NEW.author_id := found_author_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop if exists to avoid errors on retry
DROP TRIGGER IF EXISTS trigger_assign_author_by_category ON public.articles;

CREATE TRIGGER trigger_assign_author_by_category
BEFORE INSERT ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.assign_author_by_category();
