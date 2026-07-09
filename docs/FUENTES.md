# Relevamiento de fuentes — Información y noticias del agro

> **RF AGRO · 06/07/2026** (relevamiento de Lautaro).
> Cobertura: trigo, soja, maíz, sorgo, cebada, girasol. ⭐ = imprescindible para el research diario/semanal.
> Este directorio alimenta el módulo **Noticias** (fuentes propias que BCR no tiene) y el futuro
> **Calendario de informes** (Fase 3), además de la lista de fuentes a scrapear.

---

## 1. Oficiales Argentina (Estado)

| Fuente | Qué publica | Frecuencia | Uso |
|---|---|---|---|
| ⭐ **Secretaría de Agricultura (SAGyP)** — magyp.gob.ar | SIO Granos (operaciones), DJVE registradas (Res. 128/2019), entrada de camiones y vagones por zona y producto, precios FOB oficiales y FAS teórico, **Informe Diario del Mercado de Granos**, Monitor del Comercio Granario, datos abiertos | Diario + mensual (SIO) | Núcleo F2: negociado, priceado, DJVE, camiones, capacidad de pago |
| ⭐ **Dirección de Estimaciones Agrícolas (DEA-SAGyP)** | Estimaciones oficiales de superficie, producción y rindes por cultivo (sorgo, cebada, girasol); cierre de campaña | Mensual + series | Contraste oficial vs bolsas/USDA |
| ⭐ **ORA — Oficina de Riesgo Agropecuario** (ora.gob.ar) | Reservas de agua en suelo por localidad, índice satelital de déficit hídrico (TVDI), El Niño/La Niña, alerta hidrológica | Semanal/decadial | Módulo clima (gap #1) |
| **BCRA** | Tipo de cambio, series monetarias, operaciones de cambios (con rezago) | Diario | Panel cambiario, compras BCRA (skill bcra-macro) |
| **INDEC** | Comercio exterior (ICA, complejos exportadores), IPC | Mensual | Macro y exportaciones (skill indec) |
| **INTA** | Informes agrometeorológicos semanales, márgenes zonales | Semanal/continuo | Clima y costos |
| **SMN** | Pronósticos, alertas, pronóstico agropecuario | Diario | Clima |
| **INA + Prefectura Naval** | Alturas y pronóstico del Paraná a 7/15 días (Corrientes–Rosario) | Diario/semanal | Logística hidrovía (bajante) |
| **SENASA** | Certificaciones de exportación, sanidad | Continuo | Secundario |
| **Secretaría de Finanzas / Tesoro** | Licitaciones de LECAPs y deuda en pesos | Quincenal | Insumo pestaña TASAS |

## 2. Bolsas y cámaras (corazón del research argentino)

| Fuente | Qué publica | Frecuencia | Uso |
|---|---|---|---|
| ⭐ **Bolsa de Cereales de Buenos Aires — PAS** | Panorama Agrícola Semanal: siembra, cosecha, condición y producción de los 6 cultivos, 15 zonas; Estado y Condición de Cultivos; Explorador de Márgenes; ReTAA | **Jueves 15:00, gratis** | Estado de cultivos + estimaciones + márgenes |
| ⭐ **BCR — Bolsa de Comercio de Rosario** | GEA (estimaciones y clima), Informativo Semanal (viernes), commodities diario, camiones y embarques, capacidad de pago | Diario + semanal | Estimaciones, logística, análisis |
| ⭐ **Cámara Arbitral de Cereales de Rosario** | Precios pizarra de referencia | Diario hábil | Insumo pizarra vs A3 |
| **Cámara Arbitral BCBA** | Pizarra Buenos Aires | Diario | Complemento |
| **Bolsa de Cereales de Córdoba (BCCBA)** | Cultivos, agrometeorológicos, estimaciones provinciales, satelital | Semanal/mensual | Córdoba maicero |
| **Bolsa de Cereales y Productos de Bahía Blanca (BCP)** | Estimaciones trigo y **cebada** zona sur, embarques Bahía Blanca | Semanal | Referencia regional de cebada |
| **Bolsa de Cereales de Entre Ríos — SIBER** | Estimaciones Entre Ríos | Semanal | Trigo/maíz/soja ER |
| **Bolsa de Comercio de Santa Fe (CES)** | Índices y márgenes regionales | Mensual | Complemento |
| ⭐ **CIARA-CEC** | Liquidación de divisas de la agroexportación | Mensual + dato semanal en medios | Flujo de dólares del agro → panel cambiario |
| **Federación de Acopiadores** | Congresos (A Todo Trigo), análisis de fina | Eventual | Análisis cebada |

## 3. Asociaciones de cadena — mapa por cultivo

- **Trigo → ArgenTrigo**; complementos: PAS, BCP Bahía Blanca, FranceAgriMer, Mar Negro.
- **Soja → ACSOJA**; complementos: NOPA/ABIOVE (crush), Oil World, Brasil (CONAB/AgRural/IMEA).
- **Maíz y sorgo → MAIZAR**; complementos: EIA etanol, safrinha Brasil, China (sorgo).
- **Cebada →** sin asociación propia: PAS, BCP Bahía Blanca, Federación de Acopiadores, cebadacervecera.com.ar; internacional: ABARES (Australia) y Mar Negro.
- **Girasol → ASAGIR**; internacional: Oil World y consultoras del Mar Negro (Ucrania/Rusia).
- Transversales: **CREA** (SEA), gremiales (SRA, Coninagro, CRA, FAA — más política que datos).

## 4. Mercados

| Fuente | Qué publica | Frecuencia |
|---|---|---|
| ⭐ **A3 Mercados** (ex Matba-Rofex) | A3 Live (tiempo real gratis), históricos exportables, boletín diario, API Primary/pyRofex | Tiempo real + diario |
| ⭐ **CME Group / CBOT** | Futuros y opciones Chicago (soja, maíz, trigo), settles, volumen y OI | Tiempo real (usar demorado por licencia) |
| ⭐ **CFTC — Commitments of Traders** | Posición de fondos especulativos y comerciales | **Viernes 15:30 ET** (datos al martes) |
| **BYMA / MAV** | Renta fija (LECAPs, dólar linked), pagarés y cheques (MAV = financiamiento agro) | Diario |
| **Euronext/MATIF** | Trigo y colza Europa | Tiempo real |

## 5. Logística y puertos

- ⭐ **NABSA** — line-up diario de buques en PDF (nabsa.com.ar) · **Antares Ship Agents** · **dataPORTUARIA** (análisis de embarques).
- **Consorcio Puerto Bahía Blanca** y **Puerto Quequén** — estadísticas y programación de embarques.
- **INA/Prefectura** — altura del Paraná (calados y capacidad de carga en Up-River).

## 6. Clima e hidrología (además de ORA/SMN/INTA/INA)

- ⭐ **NOAA/CPC** — diagnóstico y pronóstico ENSO (Niño/Niña), mensual.
- **SISSA / CRC-SAS** — sistema de sequías del sur de Sudamérica, lluvia a 15 días.
- **CREAN (UNC)** — monitoreo de sequías (SPI mensual).
- Modelos GFS/ECMWF vía visualizadores (pronóstico extendido).

## 7. Internacional — oficiales

**EEUU (USDA y agencias):**
| Informe | Frecuencia / día | Por qué importa |
|---|---|---|
| ⭐ WASDE | Mensual (~día 8-12, 12:00 ET) | El informe que mueve mercados |
| ⭐ Export Sales (FAS) | **Jueves 8:30 ET** | Demanda semanal EEUU |
| ⭐ Crop Progress (NASS) | **Lunes 16:00 ET** (abr–nov) | Condición de cultivos EEUU |
| Export Inspections (AMS) | Lunes | Embarques |
| Grain Stocks | Trimestral (ene/mar/jun/sep) | Sorpresas de stocks |
| Prospective Plantings / Acreage | Fin de marzo / fin de junio | Área EEUU |
| Ventas flash diarias | 9:00 ET cuando hay ventas grandes | Señal de demanda (China) |
| Ag Outlook Forum | Febrero | Primeras proyecciones |
| FAS GAIN (agregadurías) | Continuo | Informes por país |
| ERS Outlooks (Feed, Oil Crops, Wheat) | Mensual | Análisis por cadena |

**Brasil:** ⭐ CONAB (safra mensual, ~2ª semana) · IBGE-LSPA (mensual) · DERAL Paraná (semanal, safrinha) · IMEA Mato Grosso (semanal) · ABIOVE (crush/export mensual) · ANEC (embarques semanales) · Comex Stat/SECEX.

**Europa:** Comisión Europea DG AGRI · JRC-**MARS Bulletin** (mensual) · **FranceAgriMer** (condición de cultivos, semanal) · Eurostat.

**Mar Negro:** SovEcon e IKAR (Rusia), APK-Inform y UkrAgroConsult (Ucrania).

**Australia/Canadá:** ⭐ ABARES — Australian Crop Report trimestral (mar/jun/sep/dic) · StatCan + AAFC.

**Multilaterales:** FAO — índice de precios (mensual) y AMIS Market Monitor · **IGC** — Grain Market Report mensual · OCDE-FAO Outlook (anual).

**Demanda y biocombustibles:** ⭐ NOPA (crush soja EEUU, ~día 15) · ⭐ EIA (etanol, **miércoles**) · EPA (RVO) · MPOB (palma Malasia, ~día 10) · GACC/aduanas China (mensual).

## 8. Consultoras y analistas internacionales

Reuters/Refinitiv · Bloomberg · S&P Global Commodity Insights · Fastmarkets Agricensus · StoneX (⭐ Arlan Suderman en X) · Hedgepoint (Sol Arcidiacono) · **Oil World** (ISTA Mielke) · Safras & Mercado y **AgRural** · Pro Farmer (crop tour agosto) · DTN · ⭐ **Karen Braun** (@kannbwx, Reuters).

## 9. Analistas y consultoras Argentina (redes/medios)

Dante Romano (@drgranos, Austral/fyo) · Nóvitas (Enrique Erize, Diego de la Puente) · Agritrend (Gustavo López) · Paulina Lescano · Lorena D'Angelo (Clínica de Granos) · Emilce Terré y Estudios Económicos BCR · Javier Preciado Patiño (RIA) · Marianela De Emilio (INTA) · Salvador Di Stefano · AZ Group (Sebastián Salvaro) · Zorraquín + Meneses.

## 10. Medios

**Argentina:** Agrofy News · Infocampo · Bichos de Campo · La Nación Campo · Clarín Rural · Agrositio (Clínica de Granos) · TodoAgro · dataPORTUARIA · Valor Soja · Canal Rural / La Red Rural · Márgenes Agropecuarios (paga) · cebadacervecera.com.ar.
**Internacionales:** Reuters Commodities · Bloomberg · AgWeb/Farm Journal · DTN Progressive Farmer · Notícias Agrícolas y Globo Rural (Brasil) · World-Grain · Barchart News.

## 11. Calendario resumen (ritmo de publicación)

- **Diario:** pizarra Cámara Arbitral · FOB/FAS oficial · DJVE registradas · camiones y vagones · Informe Diario del Mercado de Granos (SAGyP) · boletín A3 · line-up NABSA · settles CBOT/A3.
- **Lunes:** USDA Export Inspections + Crop Progress (en temporada).
- **Miércoles:** EIA etanol · GEA-BCR (semanal).
- **Jueves:** ⭐ USDA Export Sales (8:30 ET) + ⭐ PAS Bolsa de Cereales (15:00 AR).
- **Viernes:** ⭐ CFTC COT (15:30 ET) + Informativo Semanal BCR.
- **Mensual:** WASDE (~8-12) · CONAB (~2ª) · NOPA (~15) · DEA · FAO (primeros días) · IGC · MARS · MPOB (~10) · CIARA-CEC · aduanas China.
- **Trimestral/estacional:** Grain Stocks (ene/mar/jun/sep) · Prospective Plantings (fin mar) · Acreage (fin jun) · ABARES (mar/jun/sep/dic) · Outlook Forum USDA (feb) · Pro Farmer (ago).

## 12. Notas de verificación (de Lautaro, 06/07/2026)

PAS cubre los 6 cultivos y sale jueves 15:00 gratis; ORA publica reservas de agua por cultivo/localidad; DEA emite informe mensual; SAGyP publica Informe Diario del Mercado de Granos; BCP Bahía Blanca = referencia de cebada; DJVE de publicación diaria obligatoria (Res. 128/2019 art. 16); A3 Live e históricos abiertos verificados. Horarios USDA/CFTC/EIA/NOPA = práctica estándar; confirmar contra el calendario oficial de cada organismo al armar el módulo de alertas (Fase 3).
