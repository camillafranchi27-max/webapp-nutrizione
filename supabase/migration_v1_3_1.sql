-- ASTARTE v1.3.1 - patch stabilità
-- È sicuro eseguirla anche se "free" era già stato aggiunto.

alter table public.meal_logs
  drop constraint if exists meal_logs_status_check;

alter table public.meal_logs
  add constraint meal_logs_status_check
  check (status in ('recorded','according_to_plan','modified','extra','free'));

-- Mantiene esplicita la nuova struttura wellbeing, senza sovrascrivere dati.
alter table public.daily_logs
  add column if not exists water_2l boolean not null default false,
  add column if not exists mindfulness text[] not null default '{}'::text[];
