-- ============================================================================
-- 0002 — Fix: allow privileged contexts (SQL Editor / service_role) to update
--             profiles.role and profiles.is_active.
-- ============================================================================
-- The original guard_profile_role() trigger blocked role changes whenever
-- is_super_admin() returned false. In the Supabase SQL Editor (and any
-- service_role / postgres connection) auth.uid() is NULL, so is_super_admin()
-- always returns false there — which blocked the very SQL we tell the operator
-- to run to bootstrap the first super admin.
--
-- The fix: short-circuit when auth.uid() is NULL. Such contexts are already
-- privileged (you must hold the service_role key or DB credentials to reach
-- them). End-user requests via PostgREST always have a non-null auth.uid().
-- ============================================================================

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
