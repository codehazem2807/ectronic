-- جدول ملاحظات الصيانة
-- نفّذ الملف بالكامل في Supabase SQL Editor

create table if not exists public.maintenance_notes (
    id uuid primary key default gen_random_uuid(),
    title varchar(150) not null,
    content text not null,
    category varchar(30) not null default 'technical'
        check (category in ('technical', 'customer', 'procedure', 'general')),
    priority varchar(20) not null default 'medium'
        check (priority in ('low', 'medium', 'high')),
    status varchar(20) not null default 'open'
        check (status in ('open', 'done')),
    repair_order_id uuid null references public.repair_orders(id) on delete set null,
    created_by uuid null references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists maintenance_notes_created_at_idx
    on public.maintenance_notes (created_at desc);
create index if not exists maintenance_notes_status_idx
    on public.maintenance_notes (status);
create index if not exists maintenance_notes_repair_order_id_idx
    on public.maintenance_notes (repair_order_id);

create or replace function public.set_maintenance_notes_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists maintenance_notes_updated_at on public.maintenance_notes;
create trigger maintenance_notes_updated_at
before update on public.maintenance_notes
for each row execute function public.set_maintenance_notes_updated_at();

alter table public.maintenance_notes enable row level security;

drop policy if exists "maintenance notes read" on public.maintenance_notes;
create policy "maintenance notes read"
on public.maintenance_notes for select
to anon, authenticated
using (true);

drop policy if exists "maintenance notes insert" on public.maintenance_notes;
create policy "maintenance notes insert"
on public.maintenance_notes for insert
to anon, authenticated
with check (true);

drop policy if exists "maintenance notes update" on public.maintenance_notes;
create policy "maintenance notes update"
on public.maintenance_notes for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "maintenance notes delete" on public.maintenance_notes;
create policy "maintenance notes delete"
on public.maintenance_notes for delete
to anon, authenticated
using (true);

comment on table public.maintenance_notes is 'ملاحظات وتعليمات الصيانة الفنية';
comment on column public.maintenance_notes.category is 'technical, customer, procedure, general';
comment on column public.maintenance_notes.priority is 'low, medium, high';
comment on column public.maintenance_notes.status is 'open, done';
