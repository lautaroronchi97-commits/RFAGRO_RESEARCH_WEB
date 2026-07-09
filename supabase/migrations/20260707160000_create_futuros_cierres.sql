-- Cierres históricos de futuros de A3/Matba ROFEX (granos), fuente: CEM.
-- Una fila por (símbolo, fecha) = el cierre/ajuste diario de cada posición.
-- Proyecto Supabase: lineup-argentina (gbpfgfeksqmzmsxnxiwg).

create table if not exists public.futuros_cierres (
  symbol          text        not null,   -- ej. SOJ.ROS/JUL26
  fecha           date        not null,   -- fecha de la rueda (de dateTime)
  producto        text,                   -- ej. "SOJ Dolar MATba"
  underlying      text,                   -- SOJ / MAI / TRI (prefijo del símbolo)
  posicion        text,                   -- JUL26 (lo que sigue a la /)
  settlement      numeric,                -- precio de ajuste
  previous_close  numeric,
  open            numeric,
  high            numeric,
  low             numeric,
  close           numeric,
  volume          integer,
  trade_count     integer,
  open_interest   numeric,
  oi_change       numeric,
  change          numeric,
  change_percent  numeric,
  implied_rate    numeric,
  actualizado_en  timestamptz not null default now(),
  primary key (symbol, fecha)
);

create index if not exists futuros_cierres_fecha_idx on public.futuros_cierres (fecha desc);
create index if not exists futuros_cierres_under_fecha_idx on public.futuros_cierres (underlying, fecha desc);

-- RLS: lectura anónima (igual que el resto de tablas del proyecto).
alter table public.futuros_cierres enable row level security;
drop policy if exists "anon read futuros_cierres" on public.futuros_cierres;
create policy "anon read futuros_cierres" on public.futuros_cierres
  for select to anon using (true);

-- Vista: último cierre disponible por posición (pizarra para el panel).
create or replace view public.futuros_cierres_ultimo
with (security_invoker = true) as
select distinct on (symbol)
  symbol, fecha, underlying, posicion, producto,
  settlement, close, change, change_percent,
  volume, open_interest, oi_change, implied_rate
from public.futuros_cierres
order by symbol, fecha desc;

grant select on public.futuros_cierres_ultimo to anon;
