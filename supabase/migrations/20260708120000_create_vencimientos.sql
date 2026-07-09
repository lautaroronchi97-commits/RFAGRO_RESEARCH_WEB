-- Vencimientos (maturity) de los futuros de granos de A3/Matba ROFEX.
-- Fuente: CEM `GET /api/v2/symbols` (campo `maturityDate`). Son estáticos por
-- símbolo y se usan para calcular los días al vencimiento → TNA de arbitrajes
-- (hoy → vto) y de pases (vto larga − vto cercana).
-- Proyecto Supabase: lineup-argentina (gbpfgfeksqmzmsxnxiwg).

create table if not exists public.vencimientos (
  symbol         text primary key,   -- ej. SOJ.ROS/JUL26
  underlying     text,               -- SOJ / MAI / TRI
  posicion       text,               -- JUL26
  vencimiento    date not null,      -- maturityDate del CEM
  actualizado_en timestamptz not null default now()
);

alter table public.vencimientos enable row level security;
drop policy if exists "anon read vencimientos" on public.vencimientos;
create policy "anon read vencimientos" on public.vencimientos
  for select to anon using (true);

-- Seed inicial (granos ROS USD, vencimientos >= 2026). Refrescable por el cron.
insert into public.vencimientos (symbol, underlying, posicion, vencimiento) values
('MAI.ROS/ABR26','MAI','ABR26','2026-04-23'),
('MAI.ROS/ABR27','MAI','ABR27','2027-04-23'),
('MAI.ROS/AGO26','MAI','AGO26','2026-08-24'),
('MAI.ROS/DIC26','MAI','DIC26','2026-12-21'),
('MAI.ROS/ENE26','MAI','ENE26','2026-01-23'),
('MAI.ROS/ENE27','MAI','ENE27','2027-01-22'),
('MAI.ROS/FEB26','MAI','FEB26','2026-02-20'),
('MAI.ROS/JUL26','MAI','JUL26','2026-07-24'),
('MAI.ROS/JUL27','MAI','JUL27','2027-07-23'),
('MAI.ROS/JUN26','MAI','JUN26','2026-06-23'),
('MAI.ROS/MAR26','MAI','MAR26','2026-03-20'),
('MAI.ROS/MAY26','MAI','MAY26','2026-05-21'),
('MAI.ROS/NOV26','MAI','NOV26','2026-11-20'),
('MAI.ROS/SEP26','MAI','SEP26','2026-09-23'),
('MAI.ROS/SEP27','MAI','SEP27','2027-09-23'),
('SOJ.ROS/ABR26','SOJ','ABR26','2026-04-23'),
('SOJ.ROS/ABR27','SOJ','ABR27','2027-04-23'),
('SOJ.ROS/ENE26','SOJ','ENE26','2026-01-23'),
('SOJ.ROS/ENE27','SOJ','ENE27','2027-01-22'),
('SOJ.ROS/FEB26','SOJ','FEB26','2026-02-20'),
('SOJ.ROS/JUL26','SOJ','JUL26','2026-07-24'),
('SOJ.ROS/JUL27','SOJ','JUL27','2027-07-23'),
('SOJ.ROS/JUN26','SOJ','JUN26','2026-06-23'),
('SOJ.ROS/MAR26','SOJ','MAR26','2026-03-20'),
('SOJ.ROS/MAY26','SOJ','MAY26','2026-05-21'),
('SOJ.ROS/MAY27','SOJ','MAY27','2027-05-21'),
('SOJ.ROS/NOV26','SOJ','NOV26','2026-11-20'),
('SOJ.ROS/SEP26','SOJ','SEP26','2026-09-23'),
('TRI.ROS/ABR26','TRI','ABR26','2026-04-23'),
('TRI.ROS/AGO26','TRI','AGO26','2026-08-24'),
('TRI.ROS/DIC26','TRI','DIC26','2026-12-21'),
('TRI.ROS/ENE26','TRI','ENE26','2026-01-23'),
('TRI.ROS/ENE27','TRI','ENE27','2027-01-22'),
('TRI.ROS/FEB26','TRI','FEB26','2026-02-20'),
('TRI.ROS/JUL26','TRI','JUL26','2026-07-24'),
('TRI.ROS/JUN26','TRI','JUN26','2026-06-23'),
('TRI.ROS/MAR26','TRI','MAR26','2026-03-20'),
('TRI.ROS/MAR27','TRI','MAR27','2027-03-23'),
('TRI.ROS/MAY26','TRI','MAY26','2026-05-21'),
('TRI.ROS/NOV26','TRI','NOV26','2026-11-20'),
('TRI.ROS/SEP26','TRI','SEP26','2026-09-23')
on conflict (symbol) do update set
  vencimiento = excluded.vencimiento,
  underlying = excluded.underlying,
  posicion = excluded.posicion,
  actualizado_en = now();
