// Lee las hojas auxiliares de plantilla/plantilla.xlsm y genera database/catalogos.json
// Uso: npm run importar
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const RUTA_PLANTILLA = path.join(__dirname, '..', '..', 'plantilla', 'plantilla.xlsm');
const RUTA_SALIDA = path.join(__dirname, '..', '..', 'database', 'catalogos.json');

const sinTildes = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const val = (c) => {
  let v = c.value;
  if (v && typeof v === 'object') {
    if (v.richText) v = v.richText.map((x) => x.text).join('');
    else if ('result' in v) v = v.result;
    else if ('text' in v) v = v.text;
  }
  return v === null || v === undefined ? null : v;
};
const txt = (c) => {
  const v = val(c);
  return v === null ? null : String(v);
};

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(RUTA_PLANTILLA);

  // Acción -> Acción Específica -> Sub Acción (hojas Accion, AccionEspecifica, SubAccion)
  const acciones = [];
  wb.getWorksheet('Accion').eachRow((r, i) => {
    if (i === 1 || !txt(r.getCell(1))) return;
    acciones.push({ nombre: txt(r.getCell(1)), codigo: txt(r.getCell(3)) });
  });
  const accionesEsp = [];
  wb.getWorksheet('AccionEspecifica').eachRow((r, i) => {
    if (i === 1 || !txt(r.getCell(1))) return;
    accionesEsp.push({ nombre: txt(r.getCell(1)), codigo: txt(r.getCell(3)), codigoAccion: txt(r.getCell(4)) });
  });
  const subAcciones = [];
  wb.getWorksheet('SubAccion').eachRow((r, i) => {
    if (i === 1 || !txt(r.getCell(1))) return;
    subAcciones.push({ nombre: txt(r.getCell(1)), codigoAccionEsp: txt(r.getCell(5)) });
  });

  const accionPorCodigo = Object.fromEntries(acciones.map((a) => [a.codigo, a.nombre]));
  const espPorCodigo = Object.fromEntries(accionesEsp.map((e) => [e.codigo, e.nombre]));
  const arbolAcciones = {};
  acciones.forEach((a) => (arbolAcciones[a.nombre] = {}));
  accionesEsp.forEach((e) => {
    const a = accionPorCodigo[e.codigoAccion];
    if (a) arbolAcciones[a][e.nombre] = [];
  });
  subAcciones.forEach((s) => {
    const e = espPorCodigo[s.codigoAccionEsp];
    if (!e) return;
    const a = accionPorCodigo[accionesEsp.find((x) => x.nombre === e).codigoAccion];
    if (a && !arbolAcciones[a][e].includes(s.nombre)) arbolAcciones[a][e].push(s.nombre);
  });

  // Tipo de Agente -> Actividad (hoja ActividadAgente, columnas A-D)
  const agentes = {};
  wb.getWorksheet('ActividadAgente').eachRow((r, i) => {
    if (i === 1) return;
    const tipo = txt(r.getCell(2));
    const act = txt(r.getCell(4));
    if (!tipo || !act) return;
    // 'Informal' aparece dos veces (una con espacio al final): se unen sus actividades
    const clave = Object.keys(agentes).find((k) => k.trim() === tipo.trim()) || tipo;
    (agentes[clave] = agentes[clave] || []);
    if (!agentes[clave].includes(act)) agentes[clave].push(act);
  });

  // Oficina Regional -> Provincia -> Distrito (hoja Base, columnas AD, AF, AJ desde la fila 7)
  const base = wb.getWorksheet('Base');
  const ubicacion = {};
  base.eachRow((r, i) => {
    if (i < 7) return;
    const of = txt(r.getCell('AD'));
    const prov = txt(r.getCell('AF'));
    const dist = txt(r.getCell('AJ'));
    if (!of || !prov || !dist) return;
    ubicacion[of] = ubicacion[of] || {};
    ubicacion[of][prov] = ubicacion[of][prov] || [];
    if (!ubicacion[of][prov].includes(dist)) ubicacion[of][prov].push(dist);
  });

  // Listas simples de la hoja Base: Oficinas (AX), Meses (AZ12:AZ34), Transporte (BB4:BB9), Calidad (BE4:BE6)
  const lista = (col, desde, hasta) => {
    const out = [];
    for (let i = desde; i <= hasta; i++) {
      const v = txt(base.getCell(`${col}${i}`));
      if (v && !out.includes(v)) out.push(v);
    }
    return out;
  };
  const oficinas = lista('AX', 5, 29);
  const meses = lista('AZ', 12, 34);
  const transportes = lista('BB', 4, 9);
  const calidades = lista('BE', 4, 6);

  // Empresas supervisoras por Oficina Regional (hoja Lista de Empresas Supervisoras: B oficina, F lista)
  const emp = wb.getWorksheet('Lista de Empresas Supervisoras');
  const empresas = {};
  let actual = null;
  emp.eachRow((r, i) => {
    if (i < 7) return;
    const celdaOf = r.getCell(2);
    // la columna B está combinada: solo la celda maestra marca una nueva oficina
    const esMaestra = !celdaOf.isMerged || celdaOf.master.address === celdaOf.address;
    const of = esMaestra ? txt(celdaOf) : null;
    if (of) {
      const real = oficinas.find((o) => sinTildes(o) === sinTildes(of)) || of;
      actual = real;
      empresas[actual] = [];
    }
    const e = txt(r.getCell(6));
    if (actual && e && e !== '-' && !empresas[actual].includes(e)) empresas[actual].push(e);
  });

  const catalogos = { generado: new Date().toISOString(), fuente: 'plantilla/plantilla.xlsm',
    oficinas, meses, transportes, calidades, acciones: arbolAcciones, agentes, ubicacion, empresas };
  fs.writeFileSync(RUTA_SALIDA, JSON.stringify(catalogos, null, 2), 'utf8');
  console.log('Catálogos generados en database/catalogos.json');
  console.log({ oficinas: oficinas.length, meses: meses.length, acciones: Object.keys(arbolAcciones).length,
    accionesEsp: accionesEsp.length, subAcciones: subAcciones.length, tiposAgente: Object.keys(agentes).length,
    provinciasHuanuco: Object.keys(ubicacion['Huánuco'] || {}).length, empresasHuanuco: (empresas['Huánuco'] || []).length });
}
main().catch((e) => { console.error(e); process.exit(1); });
