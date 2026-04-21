-- Add Google Calendar columns to profiles table
-- Run this in Supabase SQL Editor
alter table profiles add column if not exists gcal_feed_url text;
alter table profiles add column if not exists gcal_events jsonb default '[]';
