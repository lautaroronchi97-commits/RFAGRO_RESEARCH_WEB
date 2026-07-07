# RF AGRO — Análisis de infraestructura (actual y a escala)

> Escrito el 07/07/2026 a pedido de Lautaro, a partir de la lista completa de trabajos de research
> (pizarra vs matba, pases históricos, volúmenes, informes de bolsas/USDA/Conab, lineups, DJVE,
> sintéticos, reporte diario, etc.). Objetivo declarado: **web rápida, dinámica y poco costosa**.

---

## 1. Foto de la infraestructura actual

Hoy la web es **una sola pieza**: Next.js 16 en Vercel, sin base de datos.

```
Usuario ──► Vercel (Next.js, ISR 60s) ──► fuentes externas (MAE, data912, dolarapi, criptoya)
```

- Cada 60 segundos (como máximo) Vercel regenera la página: hace ~6 requests a las fuentes,
  arma el HTML y lo cachea. Los usuarios reciben esa copia cacheada → la página es rápida
  aunque las fuentes sean lentas.
- **No hay memoria**: cada regeneración pisa a la anterior. No se guarda nada. Si una fuente
  se cae, el panel se degrada; si querés ver "cómo estaba ayer", no existe.
- No hay tareas programadas, ni usuarios/login, ni almacenamiento de archivos.
- Plan Vercel **Hobby** (gratis, no-comercial).

Esta arquitectura está bien para lo que hace hoy (mostrar el último dato), pero **no puede**
hacer casi nada de la lista nueva, porque casi todo lo de la lista compara *hoy vs histórico*
o acumula datos en el tiempo.

## 2. Qué exige la lista nueva

Agrupando los ~20 ítems, aparecen exactamente **4 capacidades** de infraestructura:

| Capacidad | Ítems de la lista que la necesitan |
|---|---|
| **A. Base de datos con historia** | pases actual vs histórico, acumulados de rueda/compras BCRA, variación semanal del USD, histogramas semanales, % sobre cosecha, porcentajes actuales vs históricos, total priceado/negociado, DJVE semanal/mensual, capacidad de pago |
| **B. Tareas automáticas diarias** (ingesta) | todo lo anterior (alguien tiene que guardar el dato cada día) + detectar informes de bolsas/USDA/Conab, scrape de pizarra CAC, lineups de barcos, camiones, SIO Granos, reporte diario |
| **C. Almacenamiento de archivos** | guardar informes de Bolsa Rosario/Córdoba/BsAs, USDA, Conab (PDFs) |
| **D. Interactividad en el navegador** | calculadoras, gráficos dinámicos, vista clientes (y a futuro login) |

Nada de la lista exige tiempo real tick-a-tick (eso queda en eTrader/Excel), y eso es la
clave de que esto pueda ser barato.

## 3. Arquitectura objetivo

Es la **misma dirección que ya está aprobada en Fase C** (Supabase + cron), confirmada y
ampliada. La regla de oro: **separar la ingesta del servicio**.

```
                    ┌─────────────────────────────────────────────┐
  GitHub Actions    │  Supabase (Postgres + Storage + Auth)       │
  (cron 30' rueda,  │  · snapshots intradía (retención limitada)  │
  diario post-cierre)──► series diarias (para siempre)            │
        │           │  · archivos: informes PDF                   │
        ▼           │  · kv: token A3, flags                      │
  fuentes: A3, MAE, └──────────────────┬──────────────────────────┘
  CAC, data912, BCRA,                  │  (solo lectura, queries simples)
  DJVE, SIO, USDA…                     ▼
                          Vercel (Next.js, ISR) ──► usuarios
                          calculadoras/gráficos = client-side (costo cero)
```

Por qué esta forma cumple los tres objetivos:

- **Rápida**: la web nunca espera a las fuentes externas en un request. Lee de Postgres
  (queries de milisegundos, misma región) y el HTML se sigue cacheando con ISR. Los datos
  "pesados" para gráficos históricos van pre-agregados (una fila por día, no mil ticks).
- **Dinámica**: calculadoras y gráficos corren en el navegador del cliente con datos ya
  cargados → cero costo por uso, respuesta instantánea. Historia disponible para cualquier
  comparación "actual vs histórico".
- **Poco costosa**: el trabajo caro (llamar 10+ fuentes, scrapear, parsear) ocurre ~16 veces
  por día en un cron gratuito, **no una vez por visitante**. Mil visitantes cuestan lo mismo
  que uno. A3 lo llama SOLO el cron (además protege la credencial y el rate limit).

### Qué NO hace falta (y evitar que nos vendan)

- **Servidor propio / VPS / Docker / Kubernetes**: no. El combo Vercel+Supabase+Actions cubre
  todo el listado sin administrar máquinas.
- **WebSockets / realtime**: no; la web es demorada por diseño.
- **Backend separado (API en Node/Python aparte)**: no; los crons son scripts en el mismo repo.
- **Redis / colas / microservicios**: no a esta escala.

## 4. Base de datos: volúmenes y retención (números)

Estimación con lo que ya sabemos de A3 (≈349 instrumentos DDA + 69 DDF ≈ 420 símbolos):

| Dato | Frecuencia | Filas/año | Tamaño/año aprox. |
|---|---|---|---|
| Snapshot intradía (rueda, cada 30') | 420 × 16/día × 250 días | ~1,7 M | 300–500 MB |
| Cierre diario (todos los símbolos) | 420/día | ~105 mil | ~25 MB |
| Series macro/dólar/DJVE/volúmenes | decenas/día | ~20 mil | ~5 MB |
| Informes PDF (Storage) | ~10–30/mes | — | 1–3 GB/año |

Conclusión importante: **"años de antigüedad" es barato si se guarda cierre diario, y caro si
se guarda todo el intradía para siempre**. Política propuesta:

- `snapshots` intradía: retención **12 meses** (un job mensual borra lo viejo). Sirve para
  "cómo se movió hoy/esta semana".
- `series_diarias` (cierres + agregados: volumen del día, priceado, DJVE, etc.): **para
  siempre**. Con esto, 10 años ≈ 300 MB. Todos los gráficos históricos salen de acá.
- Con esa política, el **free tier de Supabase (500 MB)** aguanta el primer año; después
  Supabase Pro (USD 25/mes) sobra por años.

## 5. Ingesta: tareas automáticas

- **Motor**: GitHub Actions (ya previsto en C1). Gratis hasta 2.000 min/mes en repo privado;
  el cron de rueda (`*/30 13-21 UTC` L-V, ~2 min por corrida) usa ~700 min/mes. Entra.
- **Jobs** (se agregan de a uno, no todos el día 1):
  1. `rueda` cada 30' en horario de mercado: A3 (DDA+DDF), MAE, data912, dolarapi → snapshots.
  2. `cierre` diario post-rueda: consolida el día en `series_diarias` (cierre, volumen,
     priceado, variaciones) — de acá sale el **reporte diario** casi armado.
  3. `pizarra` diario: scrape CAC-BCR → tabla pizarras.
  4. `semanal`: DJVE, SIO Granos, acumulados semanales, histogramas.
  5. `informes`: chequear si salió informe nuevo (bolsas/USDA/Conab por calendario + HTTP
     HEAD), bajar PDF a Storage, marcar en el calendario de la web.
- **Observabilidad barata**: cada corrida escribe una fila en `ingest_log` (job, ok/error,
  duración). Un panel interno "salud de datos" lee esa tabla — así Lautaro ve de un vistazo
  si algo dejó de actualizar, sin pagar herramientas de monitoreo.
- Ojo conocido: los `schedule` de Actions corren desde la rama default y GitHub los pausa
  tras 60 días sin commits (con actividad normal del repo no pasa).

## 6. Costos (mensuales, USD)

| Etapa | Vercel | Supabase | GitHub Actions | Total |
|---|---|---|---|---|
| Hoy (sin clientes) | 0 (Hobby) | 0 | 0 | **0** |
| Clientes reales (obligatorio: Hobby es no-comercial) | 20 (Pro) | 0 (free tier, ~1er año) | 0 | **~20** |
| Con 1+ año de historia intradía / más storage | 20 | 25 (Pro) | 0 | **~45** |

Techo realista del proyecto completo: **USD 20–45/mes**. No hay costo por visitante ni por
uso de calculadoras. El único gatillo de suba es el tamaño de la base (controlado por la
retención del punto 4) y, mucho más adelante, el egress si los gráficos moviesen megas por
visita (se evita pre-agregando).

## 7. Riesgos principales

1. **Scraping frágil** (CAC, lineups, camiones, DJVE): cualquier cambio de HTML rompe el job.
   Mitigación: `ingest_log` + panel de salud + override manual ya previsto para pizarra.
2. **Fuentes sin API definida** (ver preguntas abajo): CBOT/metales/Merval, lineups, camiones.
   No estimar esfuerzo hasta validar cada fuente con un request real, como se hizo en Fase 0.
3. **Orden de construcción**: la tentación es hacer los 20 ítems a la vez. Todo depende de
   que C1 (Supabase + cron) exista y sea confiable; conviene clavar eso primero y que cada
   ítem nuevo sea "un job + una tabla + un panel".

## 8. Preguntas para Lautaro antes de avanzar

1. **CBOT, metales, petróleo, Merval, SPY, EWZ**: ¿de dónde salen hoy esos precios en tu
   rutina? Las fuentes gratis demoradas existen pero hay que elegir una y validarla.
2. **Lineups de barcos** ("seguir desarrollando lo ya hecho"): ¿qué es lo ya hecho y de qué
   fuente sale (NABSA, agencias, planilla propia)?
3. **Camiones en puerto**: ¿fuente concreta?
4. **Total priceado / % sobre cosecha / capacidad de pago**: ¿de dónde salen los números y
   la fórmula? (regla del proyecto: fórmula nueva = ejemplo numérico tuyo antes de codear).
5. **Reporte diario**: ¿el formato final es un panel en la web, un PDF/imagen para mandar por
   WhatsApp, o ambos?

## 9. Orden sugerido (encaja con las fases ya aprobadas)

1. Terminar **Fase B** (resiliencia, extracción de libs, tests) — es la base para que la
   ingesta reutilice las mismas fórmulas testeadas.
2. **C1**: Supabase + cron `rueda` + `cierre` + `ingest_log`. Piedra angular; sin esto no
   hay historia.
3. **C2/C3** como estaban (arbitrajes/pases reales, sintéticos TIR) pero leyendo de snapshots.
4. Ítems nuevos de la lista, de a uno por semana aprox., cada uno = job + tabla + panel:
   volúmenes/priceado → DJVE/SIO → calendario+informes → lineups/camiones → reporte diario
   ampliado (CBOT etc. cuando esté la fuente).
5. **Antes de mostrar a clientes**: Vercel Pro + Production Branch `main` + robots→index.
