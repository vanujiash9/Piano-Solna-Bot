-- Tables for persistence and human handoff
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text,
  user_name text,
  last_message_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'active', -- 'active', 'archived'
  needs_human boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL, -- 'user', 'model', 'admin'
  content text,
  media_url text,
  media_type text, -- 'image', 'video'
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;

-- Storage Bucket (Manual steps usually, but we note it)
-- Bucket: piano-solna-media
