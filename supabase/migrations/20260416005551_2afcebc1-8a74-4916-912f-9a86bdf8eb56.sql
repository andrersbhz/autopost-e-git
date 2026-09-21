
-- Groups table
CREATE TABLE public.chip_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chip_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own groups" ON public.chip_groups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own groups" ON public.chip_groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own groups" ON public.chip_groups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own groups" ON public.chip_groups FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_chip_groups_updated_at BEFORE UPDATE ON public.chip_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Group members (chips in a group)
CREATE TABLE public.chip_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.chip_groups(id) ON DELETE CASCADE,
  chip_id UUID NOT NULL REFERENCES public.phone_chips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, chip_id)
);

ALTER TABLE public.chip_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own members" ON public.chip_group_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own members" ON public.chip_group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own members" ON public.chip_group_members FOR DELETE USING (auth.uid() = user_id);

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.chip_groups(id) ON DELETE CASCADE,
  sender_chip_id UUID REFERENCES public.phone_chips(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chip_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.phone_chips;
