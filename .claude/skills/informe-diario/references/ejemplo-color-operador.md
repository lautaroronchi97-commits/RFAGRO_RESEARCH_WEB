# Ejemplo real de "color de la rueda" (aportado por Lautaro, 22/07/2026)

Lo que Lautaro carga en `/admin/datos` casi siempre es un resumen que le pasa un
operador de la mesa, con este formato — **son datos reales, no una sensación
vaga**: hay que citarlos con el mismo rigor que los del JSON de
`/api/informes/datos`, no describirlos cualitativamente si el número está ahí.

```
📊 Resúmen Cierre Mercado Rosario 22/06/2026

🌱 Soja
.  Disponible  $ 470.000 con descarga inmediata
. Agosto $ 470.000
. Noviembre U$S 335

🌽 Maíz
. Disponible : U$S 180 hasta 26/06
. Contractual  : U$S 178
. 15/07 - 15/08 U$S 179
. Agosto U$S 180
. Septiembre U$S 181

🌾 Trigo
.  Disponible :  U$S 205  Ros/Sur  / U$S 205 Ros/Norte / U$S 207 Rosario U6
. U$S 205 Julio / U$S 207 Agosto
. U$S 210 Diciembre/Enero

🌰 Sorgo
 . U$S 190+10 descarga hasta 26/6 / U$S 193 contractual / U$S 190 Julio/Agosto

💵 Dólar Banco Nación – Divisa
📥 Compra : U$S 1.452,50
📤 Venta : U$S 1.461,50
📉 Variación Diaria  ↑ + $ 0,50 ( + 0,03% )
```

## Qué más puede traer (Lautaro, 22/07/2026)

Además de precios de disponible/posiciones como el ejemplo de arriba, el color
del día puede incluir:

- **En qué precios se movió o se negoció** el mercado durante la rueda (no solo
  el cierre).
- **Si se hicieron negocios a fijar** (forwards/convenios cerrados ese día).
- **Si la exportación está "apretando"** (demanda agresiva, paga por arriba de
  lo esperado) **o floja** (sin urgencia, deja pasar la rueda).
- **Volúmenes negociados** del día (toneladas concertadas).
- **Pizarra estimada** del grano (referencia del día, puede diferir del cierre
  oficial de CAC-BCR que ya trae `pizarra` del JSON).

## Cómo usarlo al redactar (Paso 2 de SKILL.md)

- Los precios/volúmenes/pizarra estimada de acá son **tan citables como los del
  JSON** — con su número exacto, igual que pide `voz-lautaro`.
- El molde "Mesa de operaciones" (`voz-lautaro/references/ejemplos.md`) ya
  tiene el lugar para esto: cada bloque de producto cierra con
  `Negocios concertados: XXX Tns // Pizarra estimada $XXX` — sacá esos valores
  de acá cuando el color los traiga.
- "Exportación apretando/floja" es lectura de tono de mercado — va en el
  `comentario` general o en la línea del grano correspondiente, con la palabra
  tal cual la trae el operador (no la reformules a jerga distinta).
- Si el color trae un precio de disponible/posición que el JSON automático NO
  tiene (ej. sorgo, o "contractual"), es una fuente legítima adicional — citalo
  igual, aclarando de dónde sale solo si hace falta desambiguar (ej. "según la
  mesa hoy…").
- Si el color contradice el dato automático (ej. pizarra estimada vs pizarra
  CAC), no se "corrige" uno con el otro — se muestran los dos, son lecturas
  distintas del mismo día (una es la mesa operando, la otra el cierre oficial).
