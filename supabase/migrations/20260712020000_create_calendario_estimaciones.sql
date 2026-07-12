-- RF AGRO · proyecto Supabase lineup-argentina (gbpfgfeksqmzmsxnxiwg)
-- Módulo "Calendario de informes + estimaciones de producción" (docs/PLAN_CALENDARIO_PRODUCCION.md).
-- Dos tablas base. En v1 el calendario se genera en código (src/lib/calendario.ts); estas tablas son
-- la fundación de las ingestas de las sesiones B (USDA/CONAB) y C (Argentina). Aplicada vía MCP
-- apply_migration el 12/07/2026.

-- calendario_informes: un evento por publicación. La ingesta marca 'publicado' + publicado_url.
create table if not exists public.calendario_informes (
  organismo     text not null,                          -- 'USDA' | 'CONAB' | 'BCR' | 'BCBA' | 'DEA' | 'CFTC' | ...
  informe       text not null,                          -- 'WASDE' | 'Levantamento grãos' | 'PAS' | ...
  ts_utc        timestamptz not null,                   -- instante en UTC (convertir a hora Córdoba al render)
  tz_origen     text not null default 'America/New_York', -- zona de origen (el DST de EEUU mueve la hora AR)
  tipo          text not null default 'oficial',        -- 'oficial' | 'regla'
  estado        text not null default 'programado',     -- 'programado' | 'publicado' | 'reprogramado'
  importancia   text not null default 'media',          -- 'alta' | 'media' | 'baja'
  region        text,
  granos        text,
  url           text,
  publicado_url text,
  actualizado_en timestamptz not null default now(),
  primary key (organismo, informe, ts_utc)
);
comment on table public.calendario_informes is
  'Calendario de reportes del agro (USDA/CONAB/BCR/BCBA/DEA + contexto). En v1 el calendario se genera en código; esta tabla queda como base para marcar publicaciones desde la ingesta. Ver PLAN_CALENDARIO_PRODUCCION.md.';

-- estimaciones_produccion: una fila por publicación (VINTAGE). Nunca se pisa el vintage anterior:
-- así salen los deltas (vintage N vs N-1) y la evolución de la estimación de cada campaña.
create table if not exists public.estimaciones_produccion (
  organismo         text not null,   -- 'USDA' | 'CONAB' | 'BCR' | 'BCBA' | 'DEA'
  pais              text not null,   -- 'argentina' | 'brasil' | 'eeuu' | 'mundo'
  grano             text not null,   -- 'soja' | 'maiz' | 'trigo' | 'girasol' | 'sorgo' | 'cebada'
  campania          text not null,   -- '2025/26' (normalizada: USDA MY2025 = 2025/26)
  variable          text not null,   -- 'produccion' | 'area' | 'rinde'
  valor             numeric,         -- normalizado: Mt | Mha | tn/ha
  unidad            text,            -- 'Mt' | 'Mha' | 'tn/ha'
  fecha_publicacion date not null,   -- el vintage
  informe           text,            -- 'WASDE #673' | '9º levantamento' | 'PAS' | ...
  url               text,
  actualizado_en    timestamptz not null default now(),
  primary key (organismo, pais, grano, campania, variable, fecha_publicacion)
);
comment on table public.estimaciones_produccion is
  'Estimaciones de producción por organismo/país/grano/campaña, una fila por publicación (vintage) para deltas e histórico de revisiones desde 2020. Ver PLAN_CALENDARIO_PRODUCCION.md.';

create index if not exists estimaciones_lookup_idx
  on public.estimaciones_produccion (grano, pais, campania, variable, fecha_publicacion desc);

-- RLS: lectura anónima (mismo patrón que futuros_cierres/pizarra_historico/etc.).
alter table public.calendario_informes enable row level security;
alter table public.estimaciones_produccion enable row level security;

drop policy if exists "anon read calendario_informes" on public.calendario_informes;
drop policy if exists "anon read estimaciones_produccion" on public.estimaciones_produccion;
create policy "anon read calendario_informes"
  on public.calendario_informes for select to anon using (true);
create policy "anon read estimaciones_produccion"
  on public.estimaciones_produccion for select to anon using (true);
