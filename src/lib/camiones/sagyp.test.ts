import { describe, it, expect } from "vitest";
import { parseTablaDiariaSagyp } from "./sagyp";

// Fixture: recorte REAL del HTML de SAGyP consultado el 23/07/2026 (negocio/09 §FASE 1a) — la tabla
// completa de julio 2026 recortada a 2 filas de dato (17-jul con actividad, 19-jul domingo en cero)
// + la fila "Acumulados". Los valores de 17-jul son los mismos citados en negocio/09.
const FIXTURE = `<table class="tabla">
<tr>
    <td colspan="15"><h1>ENTRADA    DIARIA DE CAMIONES A PUERTOS, FÁBRICAS Y MOLINOS- POR ZONA PORTUARIA Y POR PRODUCTO (*)</h1></td>
  </tr>
<tr>
    <th width="178" rowspan="2" bgcolor="#FFFFFF"> JULIO 2026</th>
    <th colspan="4">ZONA</th>
    <th width="80" rowspan="2">TOTAL <br />
      CAMIONES</th>
    <th colspan="6">PRODUCTO</th>
    <th width="89" rowspan="2">TOTAL X CAMIONES</th>
    <th width="88" rowspan="2">VAGONES EN PLAYA</th>
  </tr>
<tr>
    <th width="164"> ROSARIO Y <br />
      ALEDAÑOS</th>
    <th width="152">DARSENA <br />
      BS AS-E. RIOS</th>
    <th width="152">PUERTO <br />
      NECOCHEA</th>
    <th width="116">PUERTO <br />
      B.BLANCA</th>
    <th width="80">TRIGO</th>
    <th width="80">MAIZ</th>
    <th width="80">SORGO</th>
    <th width="80">CEBADA</th>
    <th width="80">SOJA</th>
    <th width="87">GIRASOL</th>
  </tr>
<tr>
    <td height="22">17-jul</td>
    <td width="78">5.068</td>
    <td width="63">240</td>
    <td width="72">498</td>
    <td width="69">832</td>
    <td width="75">6.638</td>
    <td width="63">753</td>
    <td width="69">3.969</td>
    <td width="63">99</td>
    <td width="63">57</td>
    <td width="69">1.476</td>
    <td width="85">284</td>
    <td width="86">6.638</td>
    <td width="69">198</td>
  </tr>
<tr>
    <td height="22">19-jul</td>
    <td width="78">0</td>
    <td width="63">0</td>
    <td width="72">0</td>
    <td width="69">0</td>
    <td width="75">0</td>
    <td width="63">0</td>
    <td width="69">0</td>
    <td width="63">0</td>
    <td width="63">0</td>
    <td width="69">0</td>
    <td width="85">0</td>
    <td width="86">0</td>
    <td width="69">0</td>
  </tr>
<tr>
    <th height="22">Acumulados</th>
    <th>76.004</th>
    <th>3.199</th>
    <th>6.881</th>
    <th>14.464</th>
    <th>100.548</th>
    <th>10.283</th>
    <th>56.095</th>
    <th>1.556</th>
    <th>1.643</th>
    <th>26.661</th>
    <th>4.310</th>
    <th>100.548</th>
    <th>3.965</th>
  </tr>
</table>`;

describe("camiones/sagyp.ts — parser del HTML diario de SAGyP/MAGyP", () => {
  it("parsea el mes/año de la cabecera y la fila con actividad, con valores exactos", () => {
    const r = parseTablaDiariaSagyp(FIXTURE);
    expect(r.mesAnio).toBe("2026-07");
    expect(r.identidadesRotas).toBe(0);
    expect(r.filas).toHaveLength(1); // la de 19-jul (todo cero) se descarta

    const f = r.filas[0]!;
    expect(f.fecha).toBe("2026-07-17");
    expect(f.zona).toEqual({
      ROSARIO_ALEDANOS: 5068,
      DARSENA_BSAS_ER: 240,
      NECOCHEA: 498,
      BAHIA_BLANCA: 832,
    });
    expect(f.totalZona).toBe(6638);
    expect(f.producto).toEqual({
      WHEAT: 753, MAIZE: 3969, SORGHUM: 99, BARLEY: 57, SBS: 1476, SFSEED: 284,
    });
    expect(f.totalProducto).toBe(6638);
    expect(f.vagonesPlaya).toBe(198);
  });

  it("la fila con todos los valores en cero (domingo/feriado) se descarta, no se persiste", () => {
    const soloDomingo = FIXTURE.replace(/<tr>\s*<td height="22">17-jul[\s\S]*?<\/tr>/, "");
    const r = parseTablaDiariaSagyp(soloDomingo);
    expect(r.filas).toHaveLength(0);
  });

  it("HTML sin la tabla 'tabla' → filas vacías, no tira", () => {
    const r = parseTablaDiariaSagyp("<html><body>nada</body></html>");
    expect(r.filas).toHaveLength(0);
    expect(r.mesAnio).toBeNull();
  });

  it("la fila 'Acumulados' (14 celdas, <th>) no se confunde con un día", () => {
    const r = parseTablaDiariaSagyp(FIXTURE);
    expect(r.filas.some((f) => f.fecha.includes("Acumulados"))).toBe(false);
  });
});
