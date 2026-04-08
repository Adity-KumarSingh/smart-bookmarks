create table if not exists public.bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  title text not null,
  description text,
  favicon_url text,
  created_at timestamptz default now() not null
);

create index if not exists idx_bookmarks_user_id on public.bookmarks(user_id);

create index if not exists idx_bookmarks_created_at on public.bookmarks(created_at desc);

alter table public.bookmarks enable row level security;

create policy "Users can view own bookmarks"
  on public.bookmarks
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
  on public.bookmarks
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bookmarks"
  on public.bookmarks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
  on public.bookmarks
  for delete
  using (auth.uid() = user_id);

alter publication supabase_realtime add table public.bookmarks;
