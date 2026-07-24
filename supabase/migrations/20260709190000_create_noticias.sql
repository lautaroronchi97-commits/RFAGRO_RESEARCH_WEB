-- ROFO AGRO · proyecto Supabase lineup-argentina (gbpfgfeksqmzmsxnxiwg)
-- Tabla del portal de noticias: titulares con link-out (NUNCA el cuerpo de la nota).
-- La llena el cron horario de GitHub Actions (scripts/ingest-noticias.mjs) con la
-- categorización propia de src/lib/noticias-reglas.json. Dedup por link (PK):
-- el upsert re-visita titulares ya vistos (actualiza titulo/categoria/visto_en)
-- y preserva creado_en, así el orden "cuándo apareció" queda estable.

create table if not exists public.noticias (
  link text primary key,
  titulo text not null,
  fuente text not null,
  categoria text not null,             -- id de src/lib/noticias-reglas.json (mercados/economia/…)
  fecha_pub timestamptz,               -- fecha de publicación del medio (si el feed la trae)
  visto_en timestamptz not null default now(),  -- última corrida del cron que la vio
  creado_en timestamptz not null default now()  -- primera vez que entró
);

create index if not exists noticias_creado_idx on public.noticias (creado_en desc);
create index if not exists noticias_categoria_idx on public.noticias (categoria);

-- RLS: lectura anónima (igual que el resto de tablas del proyecto); escribe solo service_role.
alter table public.noticias enable row level security;
drop policy if exists "anon read noticias" on public.noticias;
create policy "anon read noticias" on public.noticias
  for select to anon using (true);
