-- Create the notes table
create table public.notes (
  id text primary key, -- Using text IDs matching client-side uuid generation
  user_id uuid references auth.users on delete cascade not null,
  title text not null default 'Untitled',
  content text not null default '',
  is_pinned boolean default false,
  is_daily_note boolean default false,
  daily_date date, -- Used to map note to a specific calendar day
  tags text[] default '{}'::text[] not null, -- Tags array
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) so users can only access their own data
alter table public.notes enable row level security;

-- Create policies for select, insert, update, and delete
create policy "Users can view their own notes"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "Users can insert their own notes"
  on public.notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own notes"
  on public.notes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own notes"
  on public.notes for delete
  using (auth.uid() = user_id);
