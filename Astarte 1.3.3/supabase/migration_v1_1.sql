-- V1.1: aggiunge lo stato "free" ai pasti.
alter table public.meal_logs drop constraint if exists meal_logs_status_check;
alter table public.meal_logs add constraint meal_logs_status_check
check (status in ('recorded','according_to_plan','modified','extra','free'));
