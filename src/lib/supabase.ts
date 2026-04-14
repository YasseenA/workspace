import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  || 'https://dcdlmfqayfrfpctuwnja.supabase.co';
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zUUxpQ554xif479NUBAmFA_F3eJI2ab';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: false }, // Clerk handles auth, not Supabase
});

// Run this SQL in Supabase → SQL Editor to create all tables:
//
// create table profiles (
//   user_id text primary key,
//   school text default 'Bellevue College',
//   canvas_base_url text default 'https://canvas.bellevuecollege.edu',
//   dark_mode boolean default false,
//   notifications_enabled boolean default true,
//   has_onboarded boolean default false,
//   work_minutes int default 25,
//   break_minutes int default 5,
//   sessions int default 0,
//   total_focus_minutes int default 0,
//   streak int default 0,
//   last_session_date text,
//   canvas_token text,
//   canvas_courses jsonb default '[]',
//   canvas_assignments jsonb default '[]',
//   canvas_submissions jsonb default '[]',
//   canvas_last_sync timestamptz,
//   created_at timestamptz default now()
// );
//
// create table notebooks (
//   id text primary key,
//   user_id text not null,
//   name text not null,
//   color text not null,
//   icon text default '📓',
//   created_at timestamptz default now()
// );
// create index on notebooks(user_id);
//
// create table notes (
//   id text primary key,
//   user_id text not null,
//   title text not null,
//   content text default '',
//   excerpt text default '',
//   notebook_id text,
//   tags text[] default '{}',
//   is_pinned boolean default false,
//   is_favorite boolean default false,
//   word_count int default 0,
//   images text[] default '{}',
//   created_at timestamptz default now(),
//   updated_at timestamptz default now()
// );
// create index on notes(user_id);
//
// create table tasks (
//   id text primary key,
//   user_id text not null,
//   title text not null,
//   description text,
//   priority text default 'medium',
//   status text default 'todo',
//   due_date timestamptz,
//   canvas_id text,
//   tags text[] default '{}',
//   created_at timestamptz default now(),
//   updated_at timestamptz default now()
// );
// create index on tasks(user_id);
//
// create table study_buddy_messages (
//   id text primary key,
//   user_id text not null,
//   role text not null,
//   text text not null,
//   timestamp bigint not null,
//   created_at timestamptz default now()
// );
// create index on study_buddy_messages(user_id);
//
// -- Disable RLS (using user_id filtering instead of Supabase auth)
// alter table profiles disable row level security;
// alter table notebooks disable row level security;
// alter table notes disable row level security;
// alter table tasks disable row level security;
// alter table study_buddy_messages disable row level security;
