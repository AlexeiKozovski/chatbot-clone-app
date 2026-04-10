 -- Run this in Supabase SQL editor (no RLS expected).
 
 create extension if not exists pgcrypto;
 
 create table if not exists public.users (
   id uuid primary key default gen_random_uuid(),
   email text not null unique,
   password_hash text not null,
   created_at timestamptz not null default now()
 );
 
 create table if not exists public.sessions (
   id uuid primary key,
   user_id uuid null references public.users(id) on delete cascade,
   questions_used integer not null default 0,
   created_at timestamptz not null default now(),
   last_seen_at timestamptz not null default now()
 );
 
 create table if not exists public.chats (
   id uuid primary key default gen_random_uuid(),
   owner_user_id uuid null references public.users(id) on delete cascade,
   owner_session_id uuid null references public.sessions(id) on delete cascade,
   title text not null,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
 );
 
 create index if not exists chats_owner_user_id_idx on public.chats(owner_user_id);
 create index if not exists chats_owner_session_id_idx on public.chats(owner_session_id);
 create index if not exists chats_updated_at_idx on public.chats(updated_at desc);
 
 create table if not exists public.messages (
   id uuid primary key default gen_random_uuid(),
   chat_id uuid not null references public.chats(id) on delete cascade,
   role text not null check (role in ('user','assistant','system')),
   content text not null,
   created_at timestamptz not null default now()
 );
 
 create index if not exists messages_chat_id_created_at_idx on public.messages(chat_id, created_at asc);
 
 create table if not exists public.attachments (
   id uuid primary key default gen_random_uuid(),
   message_id uuid not null references public.messages(id) on delete cascade,
   kind text not null check (kind in ('image','document')),
   storage_path text not null,
   mime text not null,
   size_bytes integer not null default 0,
   created_at timestamptz not null default now()
 );
 
 create index if not exists attachments_message_id_idx on public.attachments(message_id);
 
 create table if not exists public.documents (
   id uuid primary key default gen_random_uuid(),
   chat_id uuid not null references public.chats(id) on delete cascade,
   filename text not null,
   storage_path text not null,
   extracted_text text not null default '',
   created_at timestamptz not null default now()
 );
 
 create index if not exists documents_chat_id_idx on public.documents(chat_id);
 
 -- Lightweight updated_at maintenance (optional)
 create or replace function public.touch_chat_updated_at()
 returns trigger as $$
 begin
   update public.chats set updated_at = now() where id = new.chat_id;
   return new;
 end;
 $$ language plpgsql;
 
 drop trigger if exists messages_touch_chat on public.messages;
 create trigger messages_touch_chat
 after insert on public.messages
 for each row execute function public.touch_chat_updated_at();
 
