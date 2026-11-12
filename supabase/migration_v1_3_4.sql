-- ASTARTE v1.3.4 · extra, giorni dry e zone cardio
alter table public.daily_logs add column if not exists extras text[] not null default '{}'::text[];
alter table public.daily_logs add column if not exists no_alcohol boolean not null default false;
-- Aggiunge le due categorie senza cambiare le registrazioni esistenti.
-- Eseguire la parte seguente solo se workout_type è TEXT con vincolo CHECK.
do $$
declare r record;
begin
 for r in select conname from pg_constraint
   where conrelid='public.workouts'::regclass and contype='c'
     and pg_get_constraintdef(oid) ilike '%workout_type%'
 loop
  execute format('alter table public.workouts drop constraint %I',r.conname);
 end loop;
 alter table public.workouts add constraint workouts_workout_type_check
   check (workout_type in ('None','Yoga','Running','Trekking','Walking','Gym','Zone2','Zone5'));
end $$;
