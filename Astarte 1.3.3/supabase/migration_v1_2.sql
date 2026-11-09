-- ASTARTE v1.2.0
-- Aggiunge idratazione e mindfulness al diario giornaliero.

alter table public.daily_logs
  add column if not exists water_2l boolean not null default false;

alter table public.daily_logs
  add column if not exists mindfulness text[] not null default '{}'::text[];

-- Valori supportati dalla UI:
-- Respirazione, Meditazione, Journaling, Off Grid
