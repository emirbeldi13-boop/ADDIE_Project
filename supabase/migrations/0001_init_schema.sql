-- ============================================================================
-- PEDAGOTRACK / STUDIO ADDIE — Initial Schema (v1)
-- ============================================================================
-- Multi-tenant SaaS. Each visitor owns their own data; super admin sees all.
-- Roles: super_admin (manages users, full access) | visitor (own data only).
-- Run in Supabase SQL Editor on project nbzmvsxtxlawpcewvrof.
-- Idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ----------------------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('super_admin', 'visitor');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 2. PROFILES (extends auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       citext not null unique,
  full_name   text,
  role        public.app_role not null default 'visitor',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);

-- ----------------------------------------------------------------------------
-- 3. HELPERS
-- ----------------------------------------------------------------------------
-- Is the current authenticated user a super admin?
-- SECURITY DEFINER + stable so RLS policies don't recurse on profiles.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'super_admin' and is_active
       from public.profiles
      where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- Updated-at touch
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Prevent visitors from escalating their own role.
-- Privileged contexts (SQL Editor / service_role / postgres) bypass via auth.uid() IS NULL.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;  -- privileged context (SQL Editor / service_role / postgres)
  end if;

  if old.role is distinct from new.role and not public.is_super_admin() then
    raise exception 'Only super_admin can change role';
  end if;
  if old.is_active is distinct from new.is_active and not public.is_super_admin() then
    raise exception 'Only super_admin can deactivate a profile';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Auto-create profile when an auth user is created (e.g. via Supabase invite).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'visitor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 4. TENANT TABLES
-- ----------------------------------------------------------------------------
-- Convention: every table has user_id (owner). Composite (user_id, legacy_id)
-- preserves the original string IDs from the JSON seeds (ENS001, F1_KEF, etc.)
-- so the React data layer can keep using them as keys with no remapping.

-- 4.1 ENSEIGNANTS ------------------------------------------------------------
create table if not exists public.enseignants (
  user_id              uuid not null references auth.users(id) on delete cascade,
  ens_id               text not null,
  prenom               text,
  nom                  text,
  sexe                 text,
  circonscription      text,
  code_lycee           text,
  nom_lycee            text,
  ville                text,
  niveaux              text,
  statut               text,
  annee_stage          int,
  anciennete_ans       numeric,
  effectif_moy         numeric,
  note_visite_20       numeric,
  date_derniere_visite date,
  delai_visite_mois    numeric,
  observateur          text,
  dispo_confirmee      text,
  score_statut         numeric,
  score_delai          numeric,
  score_note_inv       text,        -- can be 'N/A'
  score_autopos_inv    numeric,
  score_dispo          numeric,
  score_global         numeric,
  rang_circo           int,
  recommandation       text,
  extra                jsonb not null default '{}'::jsonb,  -- forward-compat
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  primary key (user_id, ens_id)
);
create trigger trg_ens_touch before update on public.enseignants
  for each row execute function public.touch_updated_at();

-- 4.2 SESSIONS ---------------------------------------------------------------
create table if not exists public.sessions (
  user_id            uuid not null references auth.users(id) on delete cascade,
  session_id         text not null,           -- e.g. 'F1_KEF'
  formation_id       text,
  titre_formation    text,
  trimestre          text,
  circonscription    text,
  date_session       date,
  lieu               text,
  formateur          text,
  nb_inscrits        int,
  duree              text,
  statut             text,
  competence_rcet    text,
  date_are           text,
  inscrits           jsonb not null default '[]'::jsonb,    -- list of ens_id
  cdc                jsonb,                                  -- cahier des charges
  extra              jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  primary key (user_id, session_id)
);
create trigger trg_sessions_touch before update on public.sessions
  for each row execute function public.touch_updated_at();

-- 4.3 VISITS (per teacher, per-competency scoring) ---------------------------
create table if not exists public.visits (
  user_id       uuid not null references auth.users(id) on delete cascade,
  visit_id      text not null,
  ens_id        text not null,
  visit_date    date,
  observer      text,
  scores        jsonb not null default '{}'::jsonb,   -- {C1: 4.2, ...}
  weights       jsonb not null default '{}'::jsonb,   -- {C1: 20, ...}
  visit_score   numeric,
  global_score  numeric,
  note_20       numeric,
  appreciation  text,
  visit_type    text check (visit_type in ('official','informal') or visit_type is null),
  deleted       boolean not null default false,
  recorded_at   timestamptz not null default now(),
  primary key (user_id, visit_id),
  foreign key (user_id, ens_id)
    references public.enseignants(user_id, ens_id) on delete cascade
);
create index if not exists idx_visits_ens on public.visits(user_id, ens_id);

-- 4.4 OVERRIDES (one row per ens) -------------------------------------------
create table if not exists public.overrides (
  user_id      uuid not null references auth.users(id) on delete cascade,
  ens_id       text not null,
  reason       text,
  reason_text  text,
  scopes       jsonb not null default '[]'::jsonb,    -- ['GLOBAL'] or ['F1','F2']
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, ens_id),
  foreign key (user_id, ens_id)
    references public.enseignants(user_id, ens_id) on delete cascade
);
create trigger trg_overrides_touch before update on public.overrides
  for each row execute function public.touch_updated_at();

-- 4.5 AVAILABILITY (per ens, per formation) ----------------------------------
create table if not exists public.availability (
  user_id        uuid not null references auth.users(id) on delete cascade,
  ens_id         text not null,
  formation_id   text not null,                  -- 'F1', 'F2', 'GLOBAL', ...
  declared       boolean not null default false,
  status         text check (status in ('pending','validated','rejected') or status is null),
  validated_at   timestamptz,
  justification  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (user_id, ens_id, formation_id),
  foreign key (user_id, ens_id)
    references public.enseignants(user_id, ens_id) on delete cascade
);
create trigger trg_availability_touch before update on public.availability
  for each row execute function public.touch_updated_at();

-- 4.6 AUTOPOSITIONNEMENT (seed grain: ens × competence × moment) -------------
create table if not exists public.autopositionnement (
  user_id      uuid not null references auth.users(id) on delete cascade,
  autopos_id   text not null,                    -- e.g. 'AP0001'
  ens_id       text not null,
  competence   text not null,                    -- e.g. 'RC1'
  moment       text,                              -- 'Pré-cycle T0', 'Manual Update', ...
  formation    text,
  score_5      numeric,
  date_collecte date,
  primary key (user_id, autopos_id),
  foreign key (user_id, ens_id)
    references public.enseignants(user_id, ens_id) on delete cascade
);
create index if not exists idx_autopos_ens
  on public.autopositionnement(user_id, ens_id, competence);

-- 4.7 AUTOPOS MANUAL ENTRIES (admin overrides, UI-fed) -----------------------
create table if not exists public.autopos_manual (
  user_id      uuid not null references auth.users(id) on delete cascade,
  entry_id     uuid not null default gen_random_uuid(),
  ens_id       text not null,
  scores       jsonb not null default '{}'::jsonb,   -- {RC1: 3, RC2: 4, ...}
  entry_date   date,
  recorded_at  timestamptz not null default now(),
  primary key (user_id, entry_id),
  foreign key (user_id, ens_id)
    references public.enseignants(user_id, ens_id) on delete cascade
);
create index if not exists idx_autopos_manual_ens
  on public.autopos_manual(user_id, ens_id, recorded_at desc);

-- 4.8 OBSERVATIONS (seed) ----------------------------------------------------
create table if not exists public.observations (
  user_id              uuid not null references auth.users(id) on delete cascade,
  obs_id               text not null,
  ens_id               text not null,
  competence           text,
  methode_score        text,
  observateur          text,
  visite_officielle    text,
  score_5              numeric,
  indicateurs_coches   text,
  appreciation         text,
  extra                jsonb not null default '{}'::jsonb,
  primary key (user_id, obs_id),
  foreign key (user_id, ens_id)
    references public.enseignants(user_id, ens_id) on delete cascade
);

-- 4.9 KIRKPATRICK L1 — SATISFACTION ------------------------------------------
create table if not exists public.satisfaction (
  user_id          uuid not null references auth.users(id) on delete cascade,
  sat_id           text not null,
  ens_id           text,
  formation        text,
  date_satis       date,
  q1_pertinence    numeric,
  q2_qualite_anim  numeric,
  q3_methode       numeric,
  q4_supports      numeric,
  q5_applicabilite numeric,
  extra            jsonb not null default '{}'::jsonb,
  primary key (user_id, sat_id)
);
create index if not exists idx_sat_ens_formation
  on public.satisfaction(user_id, ens_id, formation);

-- 4.10 KIRKPATRICK L2 — ACQUIS -----------------------------------------------
create table if not exists public.acquis (
  user_id           uuid not null references auth.users(id) on delete cascade,
  acq_id            text not null,
  ens_id            text,
  formation         text,
  competence_ciblee text,
  pretest_5         numeric,
  posttest_20       numeric,
  posttest_5        numeric,
  delta             numeric,
  ot_atteint        text,
  extra             jsonb not null default '{}'::jsonb,
  primary key (user_id, acq_id)
);
create index if not exists idx_acq_ens_formation
  on public.acquis(user_id, ens_id, formation);

-- 4.11 KIRKPATRICK L3 — TRANSFERT --------------------------------------------
create table if not exists public.transfert (
  user_id              uuid not null references auth.users(id) on delete cascade,
  trans_id             text not null,
  ens_id               text,
  formation            text,
  date_are             text,
  pap_prevu            int,
  pap_realise          int,
  pct_realisation      text,
  actions_mises_oeuvre text,
  difficulte           text,
  extra                jsonb not null default '{}'::jsonb,
  primary key (user_id, trans_id)
);
create index if not exists idx_transfert_ens_formation
  on public.transfert(user_id, ens_id, formation);

-- 4.12 KIRKPATRICK EDITS (admin overrides on N1/N2/N3) ----------------------
create table if not exists public.kirkpatrick_edits (
  user_id      uuid not null references auth.users(id) on delete cascade,
  ens_id       text not null,
  formation_id text not null,
  level        text not null check (level in ('N1','N2','N3')),
  data         jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now(),
  primary key (user_id, ens_id, formation_id, level)
);
create trigger trg_kp_touch before update on public.kirkpatrick_edits
  for each row execute function public.touch_updated_at();

-- 4.13 TRIANGULATION (besoins) -----------------------------------------------
create table if not exists public.triangulation_besoins (
  user_id           uuid not null references auth.users(id) on delete cascade,
  besoin_id         text not null,
  description       text,
  competence_rcet   text,
  formation_ciblee  text,
  src_autopos       boolean,
  src_entretien     boolean,
  src_observation   boolean,
  src_doc           boolean,
  nb_sources        int,
  score_triang      numeric,
  statut_validation text,
  primary key (user_id, besoin_id)
);

-- 4.14 CREFOCS (per-tenant) --------------------------------------------------
create table if not exists public.crefocs (
  user_id    uuid not null references auth.users(id) on delete cascade,
  code       text not null,                    -- 'Kef', 'Béja', ...
  nom        text,
  lieu       text,
  contact    text,
  adresse    text,
  note       text,
  confirmed  boolean not null default false,
  places     int,
  logistics  jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, code)
);
create trigger trg_crefocs_touch before update on public.crefocs
  for each row execute function public.touch_updated_at();

-- 4.15 FORMATIONS (per-tenant catalogue) -------------------------------------
create table if not exists public.formations (
  user_id         uuid not null references auth.users(id) on delete cascade,
  formation_id    text not null,                -- 'F1', 'F2', ...
  titre           text,
  competence      text,
  targeted_comps  jsonb not null default '[]'::jsonb,
  data            jsonb not null default '{}'::jsonb,   -- whole record forward-compat
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (user_id, formation_id)
);
create trigger trg_formations_touch before update on public.formations
  for each row execute function public.touch_updated_at();

-- 4.16 REFERENTIAL MODULES (per-tenant catalogue) ----------------------------
create table if not exists public.referential_modules (
  user_id     uuid not null references auth.users(id) on delete cascade,
  module_id   text not null,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, module_id)
);
create trigger trg_ref_touch before update on public.referential_modules
  for each row execute function public.touch_updated_at();

-- 4.17 COMPETENCES (per-tenant labels) ---------------------------------------
create table if not exists public.competences (
  user_id     uuid not null references auth.users(id) on delete cascade,
  code        text not null,                    -- 'C1', 'RC1', ...
  label       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, code)
);
create trigger trg_comp_touch before update on public.competences
  for each row execute function public.touch_updated_at();

-- 4.18 AUDIT TRAIL -----------------------------------------------------------
create table if not exists public.audit_trail (
  user_id    uuid not null references auth.users(id) on delete cascade,
  audit_id   text not null,
  type       text,
  ens_id     text,
  data       jsonb not null default '{}'::jsonb,
  ts         timestamptz not null default now(),
  primary key (user_id, audit_id)
);
create index if not exists idx_audit_ts on public.audit_trail(user_id, ts desc);

-- 4.19 USER SETTINGS (key/value for per-user scalar config) -----------------
-- Holds: temporal_coeffs, group_weights, global_criteria, formation_filter,
--        needs_decision, needs_weights, risk_thresholds, strategic_mode, etc.
create table if not exists public.user_settings (
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
create trigger trg_user_settings_touch before update on public.user_settings
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Enable RLS + apply policy quartet on all tenant tables.
alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_super_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_super_admin())
  with check (id = auth.uid() or public.is_super_admin());

drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert on public.profiles
  for insert to authenticated
  with check (public.is_super_admin() or id = auth.uid());

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles
  for delete to authenticated
  using (public.is_super_admin());

-- All tenant tables share the same policy quartet.
do $$
declare
  t text;
  tenant_tables text[] := array[
    'enseignants','sessions','visits','overrides','availability',
    'autopositionnement','autopos_manual','observations',
    'satisfaction','acquis','transfert','kirkpatrick_edits',
    'triangulation_besoins','crefocs','formations',
    'referential_modules','competences','audit_trail','user_settings'
  ];
begin
  foreach t in array tenant_tables loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (user_id = auth.uid() or public.is_super_admin())',
      t || '_select', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (user_id = auth.uid() or public.is_super_admin())',
      t || '_insert', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (user_id = auth.uid() or public.is_super_admin())
         with check (user_id = auth.uid() or public.is_super_admin())',
      t || '_update', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using (user_id = auth.uid() or public.is_super_admin())',
      t || '_delete', t
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 6. GRANTS
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- ----------------------------------------------------------------------------
-- 7. NOTES
-- ----------------------------------------------------------------------------
-- · Anon role has no table access. All reads/writes go through authenticated.
-- · Super admin bypass is enforced via is_super_admin() in every policy.
-- · Profiles row is auto-created on auth.users insert via on_auth_user_created.
-- · To bootstrap your first super admin (after creating the auth user via
--   Supabase Dashboard → Authentication → Add user / Invite):
--     update public.profiles set role = 'super_admin' where email = 'YOUR@EMAIL';
-- · Seed/migration of the existing JSON data ships in 0002_data_migration.sql
--   once you confirm: (a) migrate JSON to super-admin account vs (b) start clean.
-- ============================================================================
