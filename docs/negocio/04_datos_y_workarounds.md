# Datos, sistemas y workarounds técnicos

> Sistemas típicos de intranet de acopios/corredoras + protocolo de trabajo con
> sus datos. Los clientes de la consultora suelen tener reportes similares (o los
> mismos reportes base).

## 1. Sistema intranet típico — 7 módulos

1. **Granos / contratos:** negocios, MPF/MPP, fijaciones, pesificaciones, ampliaciones, análisis, aplicaciones, descargas, depósito, boletos.
2. **Cupos:** gestión de cupos de descarga.
3. **Trading / posiciones:** planilla de posición (5 pestañas), negocios consolidados, ventas propias, exposición de pesos, trading.
4. **Financiero / tesorería:** bancos, cheques, PF, FCI, dólar link, deuda, posición diaria.
5. **Pagos / cobros:** libro de vencimientos, confirmaciones diarias, solicitudes de fondos.
6. **Maestros:** clientes.
7. **Cotizaciones.**

## 2. Reportes clave por módulo

- **Negocios (vista maestra):** Estado, Tipo Neg (DISP C.ENT / CJE / PAF / CTA.GTIA), TN, Vendedor/Comprador/Agente, Precio, Período Ent, Nro Cont / Cont Comp / Origen.
- **MPF/MPP operativa:** por contrato con Kgs Pact/Ent/Pend/Fij/Pes/Fact + Tipo Neg + Tipo Pago. Inventario sin fijar vigente.
- **Fijaciones / pesificaciones (eventos):** eventos del día (Nro, Kgs, Precio/Cotiz, Total, Plazo Pesif). La versión evento a evento ("Fijaciones.xls", ~21 columnas) es de criticidad **CRÍTICA** para análisis de comportamiento.
- **Análisis (calidad):** por CP/CTG — Merma, Humedad, Grado, Factor, PH, PRO.
- **Aplicaciones:** CP/CTG aplicadas a contratos.
- **Planilla de posición (5 pestañas):** (a) Anot/Carg/Aprob; (b) Ord/Fij; (c) Ofertas vivas; (d) Devueltas/Rechazadas; (e) Fij/Pesif (resumen del día por grano; "NegocioW" = wash outs).

## 3. Diccionario de datos (.xlsx adjunto al proyecto)

`Diccionario_Datos` (53 hojas): una hoja por reporte + INDICE + VOCABULARIO (34 términos: CP, CTG, PAF, CJE, CTA.GTIA, SISA, Wash Out…) + PRINTS_intranet (capturas).

**Protocolo:** Claude usa el conocimiento estratégico de estos archivos; cuando se necesita detalle de columnas de un reporte, el usuario sube el diccionario o el .xls puntual a la conversación.

## 4. Workarounds técnicos para archivos de estos sistemas

Los exports NO son estándar:
- **.xlsx del sistema** (falla openpyxl por fill schema): parseo XML directo vía `zipfile` + `ElementTree` (leer `sharedStrings.xml`, mapear rIds en `workbook.xml.rels`, iterar `sheet*.xml` con manejo de tipos `t="s"/inlineStr/str/b`/numérico).
- **.xls del sistema** (son HTML exports; xlrd falla): `pd.read_html(path, header=0)`.

## 5. Fuentes externas de mercado

- **Feed Reuters/Refinitiv** (Excel "Real Time", 9 pestañas): fuente del historial de futuros A3 para el cálculo completo del **Delta**. NO está en las intranets típicas → verificar acceso al inicio de cada proyecto.
- Instrumentos de referencia: FCI MM, t+1, LECAPs, PF, PF UVA, dólar linked, dólar futuro (MATEX, límite ~1500M/día).
