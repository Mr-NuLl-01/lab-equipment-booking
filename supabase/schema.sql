create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'student' check (role in ('student', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  location text not null,
  category text not null,
  description text,
  usage_notes text,
  status text not null default 'normal' check (status in ('normal', 'paused', 'maintenance', 'retired')),
  requires_certification boolean not null default true,
  min_booking_minutes int not null default 30 check (min_booking_minutes >= 30 and min_booking_minutes % 30 = 0),
  max_booking_minutes int check (max_booking_minutes is null or (max_booking_minutes >= 30 and max_booking_minutes % 30 = 0)),
  is_bookable boolean not null default true,
  is_pinned boolean not null default false,
  sort_order int not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.equipment
  add column if not exists is_pinned boolean not null default false;

alter table public.equipment
  add column if not exists sort_order int not null default 1000;

create table if not exists public.equipment_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  granted_by uuid references public.profiles(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, equipment_id)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  purpose text not null check (length(trim(purpose)) >= 2),
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'admin_cancelled', 'used')),
  cancel_reason text,
  cancelled_by uuid references public.profiles(id),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  check (start_time >= created_at - interval '1 minute'),
  check (((extract(minute from start_time at time zone 'Asia/Shanghai')::int % 30) = 0) and extract(second from start_time at time zone 'Asia/Shanghai') = 0),
  check (((extract(minute from end_time at time zone 'Asia/Shanghai')::int % 30) = 0) and extract(second from end_time at time zone 'Asia/Shanghai') = 0)
);

do $$
declare
  constraint_name text;
begin
  select c.conname
  into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'bookings'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%date_trunc%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.bookings drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.bookings
  drop constraint if exists bookings_no_confirmed_overlap;

alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
  check (status in ('confirmed', 'cancelled', 'admin_cancelled', 'used'));

alter table public.bookings
  add constraint bookings_no_confirmed_overlap
  exclude using gist (
    equipment_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (status = 'confirmed');

create table if not exists public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  issue_type text not null check (issue_type in ('malfunction', 'consumable', 'abnormal_use', 'other')),
  description text not null check (length(trim(description)) >= 5),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  task_type text not null default 'maintenance' check (task_type in ('consumable', 'maintenance')),
  name text not null check (length(trim(name)) >= 2),
  description text,
  interval_days int not null check (interval_days >= 1),
  last_completed_at timestamptz not null default now(),
  next_due_at timestamptz not null,
  assigned_role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (next_due_at > last_completed_at)
);

create table if not exists public.maintenance_windows (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  reason text not null check (length(trim(reason)) >= 2),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  previous_equipment_status text check (previous_equipment_status is null or previous_equipment_status in ('normal', 'paused', 'maintenance', 'retired')),
  previous_is_bookable boolean,
  completed_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

alter table public.maintenance_windows
  add column if not exists previous_equipment_status text;

alter table public.maintenance_windows
  add column if not exists previous_is_bookable boolean;

alter table public.maintenance_windows
  drop constraint if exists maintenance_windows_previous_equipment_status_check;

alter table public.maintenance_windows
  add constraint maintenance_windows_previous_equipment_status_check
  check (previous_equipment_status is null or previous_equipment_status in ('normal', 'paused', 'maintenance', 'retired'));

alter table public.maintenance_tasks
  add column if not exists task_type text not null default 'maintenance';

alter table public.maintenance_tasks
  drop constraint if exists maintenance_tasks_task_type_check;

alter table public.maintenance_tasks
  add constraint maintenance_tasks_task_type_check
  check (task_type in ('consumable', 'maintenance'));

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists equipment_touch_updated_at on public.equipment;
create trigger equipment_touch_updated_at before update on public.equipment
for each row execute function public.touch_updated_at();

drop trigger if exists bookings_touch_updated_at on public.bookings;
create trigger bookings_touch_updated_at before update on public.bookings
for each row execute function public.touch_updated_at();

drop trigger if exists issue_reports_touch_updated_at on public.issue_reports;
create trigger issue_reports_touch_updated_at before update on public.issue_reports
for each row execute function public.touch_updated_at();

drop trigger if exists maintenance_tasks_touch_updated_at on public.maintenance_tasks;
create trigger maintenance_tasks_touch_updated_at before update on public.maintenance_tasks
for each row execute function public.touch_updated_at();

drop trigger if exists maintenance_windows_touch_updated_at on public.maintenance_windows;
create trigger maintenance_windows_touch_updated_at before update on public.maintenance_windows
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'student',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.current_profile_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select status from public.profiles where id = auth.uid();
$$;

create or replace function public.is_active_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'student' and status = 'active'
  );
$$;

create or replace function public.is_enabled_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status in ('pending', 'active')
  );
$$;

create or replace function public.is_active_student_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active' and role in ('student', 'admin')
  );
$$;

alter table public.profiles enable row level security;
alter table public.equipment enable row level security;
alter table public.equipment_permissions enable row level security;
alter table public.bookings enable row level security;
alter table public.issue_reports enable row level security;
alter table public.maintenance_tasks enable row level security;
alter table public.maintenance_windows enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles
for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles insert own pending" on public.profiles;
create policy "profiles insert own pending" on public.profiles
for insert with check (
  id = auth.uid()
  and role = 'student'
  and status = 'pending'
);

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "equipment read active" on public.equipment;
drop policy if exists "equipment read enabled members" on public.equipment;
create policy "equipment read enabled members" on public.equipment
for select using (public.is_enabled_member() or public.is_admin());

drop policy if exists "equipment admin insert" on public.equipment;
create policy "equipment admin insert" on public.equipment
for insert with check (public.is_admin());

drop policy if exists "equipment admin update" on public.equipment;
create policy "equipment admin update" on public.equipment
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "bookings read own or admin" on public.bookings;
create policy "bookings read own or admin" on public.bookings
for select using (
  user_id = auth.uid()
  or public.is_admin()
  or (status = 'confirmed' and public.is_enabled_member())
);

drop policy if exists "bookings active insert own" on public.bookings;
drop policy if exists "bookings insert own when allowed by equipment" on public.bookings;
create policy "bookings insert own when allowed by equipment" on public.bookings
for insert with check (
  user_id = auth.uid()
  and public.is_enabled_member()
  and exists (
    select 1
    from public.equipment e
    where e.id = equipment_id
      and e.status = 'normal'
      and e.is_bookable = true
      and (
        e.requires_certification = false
        or public.is_admin()
        or (
          public.is_active_student()
          and exists (
            select 1
            from public.equipment_permissions ep
            where ep.user_id = auth.uid()
              and ep.equipment_id = e.id
          )
        )
      )
  )
);

drop policy if exists "bookings update own future or admin" on public.bookings;
create policy "bookings update own future or admin" on public.bookings
for update using ((user_id = auth.uid() and status = 'confirmed') or public.is_admin())
with check (
  public.is_admin()
  or (
    user_id = auth.uid()
    and (
      status <> 'confirmed'
      or start_time <= now()
      or exists (
        select 1
        from public.equipment e
        where e.id = equipment_id
          and e.status = 'normal'
          and e.is_bookable = true
          and (
            e.requires_certification = false
            or public.is_admin()
            or (
              public.is_active_student()
              and exists (
                select 1
                from public.equipment_permissions ep
                where ep.user_id = auth.uid()
                  and ep.equipment_id = e.id
              )
            )
          )
      )
    )
  )
);

drop policy if exists "equipment permissions read own or admin" on public.equipment_permissions;
create policy "equipment permissions read own or admin" on public.equipment_permissions
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "equipment permissions admin insert" on public.equipment_permissions;
create policy "equipment permissions admin insert" on public.equipment_permissions
for insert with check (public.is_admin());

drop policy if exists "equipment permissions admin update" on public.equipment_permissions;
create policy "equipment permissions admin update" on public.equipment_permissions
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "equipment permissions admin delete" on public.equipment_permissions;
create policy "equipment permissions admin delete" on public.equipment_permissions
for delete using (public.is_admin());

drop policy if exists "issues read own or admin" on public.issue_reports;
create policy "issues read own or admin" on public.issue_reports
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "issues active insert own" on public.issue_reports;
drop policy if exists "issues enabled insert own" on public.issue_reports;
create policy "issues enabled insert own" on public.issue_reports
for insert with check (user_id = auth.uid() and public.is_enabled_member());

drop policy if exists "issues admin update" on public.issue_reports;
create policy "issues admin update" on public.issue_reports
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "maintenance admin select" on public.maintenance_tasks;
create policy "maintenance admin select" on public.maintenance_tasks
for select using (public.is_admin());

drop policy if exists "maintenance admin insert" on public.maintenance_tasks;
create policy "maintenance admin insert" on public.maintenance_tasks
for insert with check (public.is_admin());

drop policy if exists "maintenance admin update" on public.maintenance_tasks;
create policy "maintenance admin update" on public.maintenance_tasks
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "maintenance windows admin select" on public.maintenance_windows;
create policy "maintenance windows admin select" on public.maintenance_windows
for select using (public.is_enabled_member() or public.is_admin());

drop policy if exists "maintenance windows admin insert" on public.maintenance_windows;
create policy "maintenance windows admin insert" on public.maintenance_windows
for insert with check (public.is_admin());

drop policy if exists "maintenance windows admin update" on public.maintenance_windows;
create policy "maintenance windows admin update" on public.maintenance_windows
for update using (public.is_admin()) with check (public.is_admin());

insert into public.equipment (name, code, location, category, description, usage_notes, status, is_bookable, requires_certification)
values
  ('真空蒸镀仪', 'EVAP-01', '洁净间 A101', '薄膜制备', '用于金属电极和功能层蒸镀。', '预约前确认坩埚、真空泵状态和冷却水。使用后填写设备记录本。', 'normal', true, true),
  ('手套箱', 'GB-01', '材料实验室 B203', '环境控制', '用于惰性气氛样品处理。', '进入前检查氧水值，严禁携带挥发性溶剂。', 'normal', true, true),
  ('台式离心机', 'CF-01', '生化间 C305', '样品处理', '常规样品离心。', '使用前确认转子平衡，结束后清洁腔体。', 'paused', false, false),
  ('超声清洗机', 'US-01', '公共平台 A区', '样品清洗', '用于常规玻璃器皿和样品架清洗。', '使用后倒掉废液并擦干水槽。', 'normal', true, false)
on conflict (code) do nothing;

update public.equipment
set requires_certification = true
where code in ('EVAP-01', 'GB-01');

update public.equipment
set requires_certification = false
where code in ('CF-01', 'US-01');

insert into public.maintenance_tasks (
  equipment_id,
  task_type,
  name,
  description,
  interval_days,
  last_completed_at,
  next_due_at,
  assigned_role,
  is_active
)
select
  e.id,
  task.task_type,
  task.name,
  task.description,
  task.interval_days,
  now(),
  now() + make_interval(days => task.interval_days),
  'admin',
  true
from public.equipment e
cross join (
  values
    ('consumable', '晶振检查', '每隔半个月提醒学生管理员检查晶振是否需要更换；更换或确认无需更换后手动重置计时。', 15),
    ('maintenance', '蒸镀机清理', '每个月提醒清理蒸镀机，并累计显示距离上次清理时间。', 30)
) as task(task_type, name, description, interval_days)
where e.code = 'EVAP-01'
  and not exists (
    select 1
    from public.maintenance_tasks mt
    where mt.equipment_id = e.id
      and mt.name = task.name
  );
