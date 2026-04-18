-- Enable Row Level Security on all tables
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- Since the app uses Clerk for auth and the Supabase anon key for data access,
-- we enable RLS with policies that allow the anon role to operate.
-- The app already filters by user_id in all queries, so RLS acts as a safety net
-- preventing any user_id mismatch from leaking data.
--
-- We use a custom Postgres setting 'app.user_id' that the client sets per-session
-- via an RPC call before performing operations.

-- Helper function to set user context
create or replace function set_user_context(uid text)
returns void as $$
begin
  perform set_config('app.user_id', uid, true);
end;
$$ language plpgsql security definer;

-- Step 1: Enable RLS
alter table profiles enable row level security;
alter table notebooks enable row level security;
alter table notes enable row level security;
alter table tasks enable row level security;
alter table study_buddy_messages enable row level security;

-- Step 2: Profiles policies
create policy "profiles_select" on profiles for select using (
  user_id = current_setting('app.user_id', true)
);
create policy "profiles_insert" on profiles for insert with check (
  user_id = current_setting('app.user_id', true)
);
create policy "profiles_update" on profiles for update using (
  user_id = current_setting('app.user_id', true)
);

-- Step 3: Notebooks policies
create policy "notebooks_all" on notebooks for all using (
  user_id = current_setting('app.user_id', true)
);

-- Step 4: Notes policies
create policy "notes_all" on notes for all using (
  user_id = current_setting('app.user_id', true)
);

-- Step 5: Tasks policies
create policy "tasks_all" on tasks for all using (
  user_id = current_setting('app.user_id', true)
);

-- Step 6: Study buddy messages policies
create policy "messages_all" on study_buddy_messages for all using (
  user_id = current_setting('app.user_id', true)
);
