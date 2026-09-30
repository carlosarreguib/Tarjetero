-- ============ Lista blanca y perfiles ============
create table public.allowed_emails (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  created_at timestamptz not null default now()
);

-- Bloquea el registro de emails no autorizados
create or replace function public.enforce_allowed_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.allowed_emails where email = lower(new.email)) then
    raise exception 'Email no autorizado';
  end if;
  return new;
end $$;

create trigger before_user_created
  before insert on auth.users
  for each row execute function public.enforce_allowed_email();

-- Crea el perfil al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end $$;

create trigger after_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Si se quita un email de la lista, pierde el acceso aunque tenga sesión
create or replace function public.is_allowed()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.allowed_emails
    where email = lower(auth.jwt() ->> 'email')
  );
$$;

-- ============ Eventos ============
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  start_date date,
  end_date date,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ============ Contactos ============
create type public.business_line as enum
  ('Refrigerantes', 'Propelentes', 'Espumas', 'Especialidades');

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  full_name text,
  company text,
  job_title text,
  phone text,
  email text,
  website text,
  note text,
  business_lines public.business_line[] not null default '{}',
  card_image_path text,
  -- columnas normalizadas para detectar duplicados
  email_norm text generated always as (nullif(lower(trim(email)), '')) stored,
  phone_norm text generated always as
    (nullif(right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 9), '')) stored,
  company_norm text generated always as
    (nullif(lower(regexp_replace(coalesce(company, ''), '[^[:alnum:]]', '', 'g')), '')) stored,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create index contacts_event_idx on public.contacts(event_id);
create index contacts_email_norm_idx on public.contacts(email_norm);
create index contacts_phone_norm_idx on public.contacts(phone_norm);
create index contacts_company_norm_idx on public.contacts(company_norm);

-- Actualiza auditoría y evita que se cambie autor o evento en una edición
create or replace function public.touch_contact()
returns trigger language plpgsql set search_path = public as $$
begin
  new.created_by = old.created_by;
  new.event_id = old.event_id;
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end $$;

create trigger contacts_touch
  before update on public.contacts
  for each row execute function public.touch_contact();

-- ============ Duplicados (aviso, no bloqueo) ============
create or replace function public.find_duplicates(
  p_email text, p_phone text, p_company text, p_name text,
  p_exclude uuid default null
)
returns table (
  contact_id uuid, full_name text, company text,
  event_name text, registered_by text, matched_on text
)
language sql stable security invoker set search_path = public as $$
  select c.id, c.full_name, c.company, e.name, p.full_name,
    case
      when nullif(lower(trim(p_email)), '') is not null
           and c.email_norm = lower(trim(p_email)) then 'email'
      when nullif(right(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), 9), '') is not null
           and c.phone_norm = right(regexp_replace(p_phone, '\D', '', 'g'), 9) then 'teléfono'
      else 'empresa y nombre'
    end
  from public.contacts c
  join public.events e on e.id = c.event_id
  left join public.profiles p on p.id = c.created_by
  where (p_exclude is null or c.id <> p_exclude)
    and (
      (nullif(lower(trim(p_email)), '') is not null
        and c.email_norm = lower(trim(p_email)))
      or (nullif(right(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), 9), '') is not null
        and c.phone_norm = right(regexp_replace(p_phone, '\D', '', 'g'), 9))
      or (nullif(lower(regexp_replace(coalesce(p_company,''), '[^[:alnum:]]', '', 'g')), '') is not null
        and c.company_norm = lower(regexp_replace(p_company, '[^[:alnum:]]', '', 'g'))
        and lower(trim(coalesce(c.full_name,''))) = lower(trim(coalesce(p_name,''))))
    );
$$;

-- ============ Clientes repetidos entre eventos ============
create view public.repeated_contacts with (security_invoker = true) as
select
  coalesce(email_norm, phone_norm) as match_key,
  max(full_name) as full_name,
  max(company) as company,
  count(distinct event_id) as events_count,
  count(*) as contacts_count
from public.contacts
where coalesce(email_norm, phone_norm) is not null
group by coalesce(email_norm, phone_norm)
having count(distinct event_id) > 1;

create view public.repeated_companies with (security_invoker = true) as
select
  company_norm,
  max(company) as company,
  count(distinct event_id) as events_count,
  count(*) as contacts_count
from public.contacts
where company_norm is not null
group by company_norm
having count(distinct event_id) > 1;

-- ============ Row Level Security ============
alter table public.allowed_emails enable row level security;  -- sin políticas: solo el propietario del proyecto
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.contacts enable row level security;

create policy "profiles_read" on public.profiles
  for select to authenticated using (public.is_allowed());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "events_read" on public.events
  for select to authenticated using (public.is_allowed());
create policy "events_insert" on public.events
  for insert to authenticated with check (public.is_allowed() and created_by = auth.uid());
create policy "events_update" on public.events
  for update to authenticated using (public.is_allowed()) with check (public.is_allowed());
create policy "events_delete_own" on public.events
  for delete to authenticated using (public.is_allowed() and created_by = auth.uid());

create policy "contacts_read" on public.contacts
  for select to authenticated using (public.is_allowed());
create policy "contacts_insert" on public.contacts
  for insert to authenticated with check (public.is_allowed() and created_by = auth.uid());
create policy "contacts_update" on public.contacts
  for update to authenticated using (public.is_allowed()) with check (public.is_allowed());
create policy "contacts_delete_own" on public.contacts
  for delete to authenticated using (public.is_allowed() and created_by = auth.uid());

-- ============ Storage (bucket privado "cards") ============
-- Objetos: {event_id}/{contact_id}.jpg
insert into storage.buckets (id, name, public) values ('cards', 'cards', false)
on conflict do nothing;

create policy "cards_read" on storage.objects
  for select to authenticated using (bucket_id = 'cards' and public.is_allowed());
create policy "cards_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'cards' and public.is_allowed());
create policy "cards_delete_own" on storage.objects
  for delete to authenticated using (bucket_id = 'cards' and owner = auth.uid());
