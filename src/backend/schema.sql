-- AnyDay production data model
-- Designed for PostgreSQL/Supabase and 5,000+ active users.
create extension if not exists pgcrypto;
create table if not exists profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text, timezone text not null default 'Asia/Kolkata', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists lists (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, color text, created_at timestamptz not null default now(), unique(user_id,name));
create table if not exists tags (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, created_at timestamptz not null default now(), unique(user_id,name));
create table if not exists tasks (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, list_id uuid references lists(id) on delete set null, title text not null check(length(trim(title))>0), notes text not null default '', due_at timestamptz, reminder_at timestamptz, recurrence_rule text, recurrence_parent_id uuid references tasks(id) on delete set null, priority smallint not null default 0 check(priority between 0 and 3), pinned boolean not null default false, completed boolean not null default false, completed_at timestamptz, all_day boolean not null default true, archived boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
alter table tasks add column if not exists archived boolean not null default false;
alter table tasks add column if not exists all_day boolean not null default true;
alter table tasks add column if not exists recurrence_parent_id uuid references tasks(id) on delete set null;
create table if not exists task_tags (task_id uuid not null references tasks(id) on delete cascade, tag_id uuid not null references tags(id) on delete cascade, primary key(task_id,tag_id));
create table if not exists subtasks (id uuid primary key default gen_random_uuid(), task_id uuid not null references tasks(id) on delete cascade, title text not null, completed boolean not null default false, position integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists task_attachments (id uuid primary key default gen_random_uuid(), task_id uuid not null references tasks(id) on delete cascade, file_name text not null, storage_path text not null, mime_type text, size_bytes bigint, created_at timestamptz not null default now());
create table if not exists calendar_connections (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, provider text not null check(provider in('google','outlook','icloud')), external_account_id text, encrypted_credentials text, enabled boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,provider));
create unique index if not exists tasks_recurrence_instance_idx on tasks(user_id,recurrence_parent_id,due_at) where recurrence_parent_id is not null;
create index if not exists tasks_user_created_idx on tasks(user_id,created_at desc);
create index if not exists tasks_user_due_idx on tasks(user_id,due_at);
create index if not exists tasks_user_completed_idx on tasks(user_id,completed,created_at desc);
create index if not exists tasks_user_updated_idx on tasks(user_id,updated_at desc);
create index if not exists tasks_active_idx on tasks(user_id,completed,archived) where deleted_at is null;
create index if not exists tasks_user_deleted_idx on tasks(user_id,deleted_at,created_at desc);
create index if not exists subtasks_task_position_idx on subtasks(task_id,position);
create index if not exists attachments_task_idx on task_attachments(task_id);
alter table profiles enable row level security; alter table lists enable row level security; alter table tags enable row level security; alter table tasks enable row level security; alter table task_tags enable row level security; alter table subtasks enable row level security; alter table task_attachments enable row level security; alter table calendar_connections enable row level security;
create policy "profiles own row" on profiles for all using(auth.uid()=id) with check(auth.uid()=id);
create policy "lists own rows" on lists for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "tags own rows" on tags for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "tasks own rows" on tasks for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "subtasks through own task" on subtasks for all using(exists(select 1 from tasks where tasks.id=subtasks.task_id and tasks.user_id=auth.uid())) with check(exists(select 1 from tasks where tasks.id=subtasks.task_id and tasks.user_id=auth.uid()));
create policy "task tags through own task" on task_tags for all using(exists(select 1 from tasks t join tags g on g.id=task_tags.tag_id where t.id=task_tags.task_id and t.user_id=auth.uid() and g.user_id=auth.uid())) with check(exists(select 1 from tasks t join tags g on g.id=task_tags.tag_id where t.id=task_tags.task_id and t.user_id=auth.uid() and g.user_id=auth.uid()));
create policy "attachments through own task" on task_attachments for all using(exists(select 1 from tasks where tasks.id=task_attachments.task_id and tasks.user_id=auth.uid())) with check(exists(select 1 from tasks where tasks.id=task_attachments.task_id and tasks.user_id=auth.uid()));
create policy "calendar own rows" on calendar_connections for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',split_part(coalesce(new.email,''),'@',1))) on conflict(id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users; create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists tasks_set_updated_at on public.tasks; create trigger tasks_set_updated_at before update on public.tasks for each row execute procedure public.set_updated_at();
drop trigger if exists subtasks_set_updated_at on public.subtasks; create trigger subtasks_set_updated_at before update on public.subtasks for each row execute procedure public.set_updated_at();
alter table tasks replica identity full;
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='tasks') then alter publication supabase_realtime add table public.tasks; end if; end $$;

-- Supabase Storage for task attachments.
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

drop policy if exists "task attachment read own files" on storage.objects;
create policy "task attachment read own files" on storage.objects
for select using (bucket_id = 'task-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "task attachment upload own files" on storage.objects;
create policy "task attachment upload own files" on storage.objects
for insert with check (bucket_id = 'task-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "task attachment delete own files" on storage.objects;
create policy "task attachment delete own files" on storage.objects
for delete using (bucket_id = 'task-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
