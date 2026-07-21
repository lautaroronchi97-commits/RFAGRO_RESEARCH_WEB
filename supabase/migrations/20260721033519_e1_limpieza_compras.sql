-- E1 fase 2 (auditoría de datos): limpieza de compras.
-- Aplicada a la base viva el 21/07/2026 vía MCP (apply_migration). Ver docs/auditoria/E1-datos.md.

-- #3: 7 filas huérfanas fuente=MAGYP (snapshot parcial de un test del scraper MAGyP reactivado,
-- todas fechadas 27/05/2026 y solo sector INDUSTRIA). Agrochat es la fuente única de compras
-- (decisión de Lautaro, 21/07/2026) → se eliminan para no ensuciar la serie ni la matview.
delete from public.compras where fuente = 'MAGYP';

-- #9: único saldo negativo (cebada cervecera 22/23 Exportación, 18/01/2023), defecto de origen
-- del export Agrochat. Se clampa a 0.
update public.compras set saldo_a_fijar_tn = 0 where saldo_a_fijar_tn < 0;

-- Refrescar la matview que consume estas filas (% sobre cosecha).
refresh materialized view public.compras_avance_hist;
