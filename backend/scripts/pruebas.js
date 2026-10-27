// Pruebas automáticas de la API. Usa una base de datos temporal (no toca database/supervision.db)
// Uso: npm run pruebas   -> genera documentos/registro_de_pruebas.md y documentos/Excel_exportado_por_el_sistema.xlsm
const path = require('path');
const fs = require('fs');
const os = require('os');

process.env.SQLITE_PATH = path.join(os.tmpdir(), `prueba_${Date.now()}.db`);
process.env.DB_DRIVER = 'sqlite';

const app = require('../server');
const cat = require('../src/services/catalogos');
const JSZip = require('jszip');

const DOCS = path.join(__dirname, '..', '..', 'documentos');
const resultados = [];
let base;

async function api(metodo, ruta, cuerpo) {
  const r = await fetch(base + ruta, { method: metodo, headers: { 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const tipo = r.headers.get('content-type') || '';
  const datos = tipo.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer());
  return { status: r.status, datos, headers: r.headers };
}
function anotar(codigo, prueba, esperado, obtenido, ok) {
  resultados.push({ codigo, prueba, esperado, obtenido, ok });
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${codigo} ${prueba}`);
}

// Genera registros válidos recorriendo los catálogos reales del Excel
function casoValido(i) {
  const acciones = Object.keys(cat.acciones);
  const accion = acciones[i % acciones.length];
  const esps = Object.keys(cat.acciones[accion]);
  const esp = esps[i % esps.length];
  const subs = cat.acciones[accion][esp];
  const agentes = Object.keys(cat.agentes);
  const agente = agentes[i % agentes.length];
  const provs = Object.keys(cat.ubicacion['Huánuco']);
  const prov = provs[i % provs.length];
  const dists = cat.ubicacion['Huánuco'][prov];
  return {
    accion, accion_especifica: esp, sub_accion: subs[0] || '',
    tipo_agente: agente, actividad: cat.agentes[agente][0],
    provincia: prov, distrito: dists[i % dists.length],
    transporte: cat.transportes[i % cat.transportes.length],
    n_supervisores: (i % 3) + 1,
    empresa: cat.empresas['Huánuco'][i % cat.empresas['Huánuco'].length],
    calidad: cat.calidades[i % cat.calidades.length],
    expediente_siged: String(202400229000 + i),
    carta_linea: `${1064350 + i}-1`,
    observaciones: i === 0 ? 'Observación con & y <símbolos> "especiales"' : '',
  };
}

(async () => {
  const servidor = app.listen(0);
  base = `http://localhost:${servidor.address().port}/api`;
  try {
    let r = await api('GET', '/parametros');
    anotar('P-01', 'Cargar parámetros desde el Excel', 'Catálogos y cabecera Noviembre / Huánuco',
      `${r.datos.oficinas.length} oficinas, ${Object.keys(r.datos.acciones).length} acciones, cabecera ${r.datos.cabecera.mes} / ${r.datos.cabecera.oficina}`,
      r.status === 200 && r.datos.cabecera.oficina === 'Huánuco' && r.datos.cabecera.mes === 'Noviembre');

    // 15 registros válidos
    const ids = [];
    for (let i = 0; i < 15; i++) {
      const c = casoValido(i);
      r = await api('POST', '/registros', c);
      const ok = r.status === 201 && r.datos.contrato === c.empresa.slice(0, 10);
      if (ok) ids.push(r.datos.id);
      anotar(`R-${String(i + 1).padStart(2, '0')}`, `Crear registro válido #${i + 1} (${c.accion_especifica})`,
        'HTTP 201 y CONTRATO calculado', `HTTP ${r.status}${r.datos.contrato ? ', contrato ' + r.datos.contrato : ''}`, ok);
    }

    // Validaciones
    const v = casoValido(1);
    const invalidos = [
      ['V-01', 'Campos obligatorios vacíos', {}, ['accion', 'empresa', 'n_supervisores']],
      ['V-02', 'N° de supervisores = 0', { ...v, n_supervisores: 0 }, ['n_supervisores']],
      ['V-03', 'N° de supervisores no numérico', { ...v, n_supervisores: 'abc' }, ['n_supervisores']],
      ['V-04', 'Acción Específica de otra Acción', { ...v, accion: '31.1 Preoperativa y denuncias', accion_especifica: '4.1 Calidad EVP (muestrales)' }, ['accion_especifica']],
      ['V-05', 'Valor inventado fuera del catálogo (empresa)', { ...v, empresa: 'EMPRESA INVENTADA SAC' }, ['empresa']],
      ['V-06', 'Distrito que no pertenece a la provincia', { ...v, provincia: '02 Ambo', distrito: '13 San Pablo de Pillao' }, ['distrito']],
      ['V-07', 'Expediente SIGED con letras', { ...v, expediente_siged: '2024-ABC' }, ['expediente_siged']],
    ];
    for (const [cod, nombre, cuerpo, campos] of invalidos) {
      r = await api('POST', '/registros', cuerpo);
      const ok = r.status === 400 && campos.every((c) => r.datos.errores && r.datos.errores[c]);
      anotar(cod, nombre, `HTTP 400 con error en: ${campos.join(', ')}`, `HTTP ${r.status}`, ok);
    }

    // Identificadores conservan ceros
    r = await api('POST', '/registros', { ...casoValido(20), expediente_siged: '000123456789' });
    const idCeros = r.datos.id;
    r = await api('GET', `/registros/${idCeros}`);
    anotar('V-08', 'Expediente SIGED conserva ceros a la izquierda', '000123456789', r.datos.expediente_siged, r.datos.expediente_siged === '000123456789');
    await api('DELETE', `/registros/${idCeros}`);

    // Consultar, buscar, filtrar
    r = await api('GET', '/registros');
    anotar('C-01', 'Consultar todos los registros', '15 registros', `${r.datos.length} registros`, r.datos.length === 15);
    r = await api('GET', '/registros?expediente=202400229003');
    anotar('C-02', 'Buscar por expediente 202400229003', '1 registro', `${r.datos.length} registro(s)`, r.datos.length === 1);
    const accionF = casoValido(0).accion;
    r = await api('GET', `/registros?accion=${encodeURIComponent(accionF)}`);
    const esperado = Array.from({ length: 15 }, (_, i) => casoValido(i)).filter((c) => c.accion === accionF).length;
    anotar('C-03', 'Filtrar por Acción', `${esperado} registro(s)`, `${r.datos.length} registro(s)`, r.datos.length === esperado);

    // 3 ediciones
    for (let k = 0; k < 3; k++) {
      const id = ids[k];
      const orig = (await api('GET', `/registros/${id}`)).datos;
      const cambio = { ...orig, n_supervisores: 5 + k, observaciones: `Editado en prueba E-0${k + 1}`, calidad: cat.calidades[(k + 1) % 3] };
      r = await api('PUT', `/registros/${id}`, cambio);
      const rel = (await api('GET', `/registros/${id}`)).datos;
      const ok = r.status === 200 && rel.n_supervisores === 5 + k && rel.observaciones === `Editado en prueba E-0${k + 1}`;
      anotar(`E-0${k + 1}`, `Editar registro id ${id} y comprobar que persiste`, 'HTTP 200 y datos nuevos al releer', `HTTP ${r.status}, supervisores ${rel.n_supervisores}`, ok);
    }
    r = await api('PUT', '/registros/99999', casoValido(0));
    anotar('E-04', 'Editar registro inexistente', 'HTTP 404', `HTTP ${r.status}`, r.status === 404);

    // 2 eliminaciones
    for (let k = 0; k < 2; k++) {
      const id = ids[ids.length - 1 - k];
      r = await api('DELETE', `/registros/${id}`);
      const rel = await api('GET', `/registros/${id}`);
      anotar(`D-0${k + 1}`, `Eliminar registro id ${id}`, 'HTTP 200 y luego 404 al consultarlo', `HTTP ${r.status} / luego ${rel.status}`, r.status === 200 && rel.status === 404);
    }

    // Exportación
    const lista = (await api('GET', '/registros')).datos;
    r = await api('GET', '/exportar-excel');
    fs.writeFileSync(path.join(DOCS, 'Excel_exportado_por_el_sistema.xlsm'), r.datos);
    anotar('X-01', 'Exportar Excel', `HTTP 200 y ${lista.length} registros vigentes`, `HTTP ${r.status}, X-Total-Registros=${r.headers.get('x-total-registros')}`,
      r.status === 200 && Number(r.headers.get('x-total-registros')) === lista.length);

    const zipPlantilla = await JSZip.loadAsync(fs.readFileSync(path.join(__dirname, '..', '..', 'plantilla', 'plantilla.xlsm')));
    const zipExport = await JSZip.loadAsync(r.datos);
    const a = Object.keys(zipPlantilla.files).filter((n) => !n.endsWith('/') && n !== 'xl/calcChain.xml').sort();
    const b = Object.keys(zipExport.files).filter((n) => !n.endsWith('/')).sort();
    anotar('X-02', 'El Excel conserva macros e imágenes', 'vbaProject.bin e imágenes presentes', `vbaProject.bin: ${!!zipExport.file('xl/vbaProject.bin')}`,
      !!zipExport.file('xl/vbaProject.bin') && !!zipExport.file('xl/media/image2.png'));
    anotar('X-03', 'El Excel conserva todas las partes de la plantilla (hojas, tablas, validaciones)', `${a.length} partes`, `${b.length} partes`, JSON.stringify(a) === JSON.stringify(b));
    let iguales = true;
    for (const n of a.filter((x) => x.startsWith('xl/worksheets/sheet') && x !== 'xl/worksheets/sheet1.xml')) {
      const o = await zipPlantilla.file(n).async('nodebuffer');
      const e = await zipExport.file(n).async('nodebuffer');
      if (!o.equals(e)) iguales = false;
    }
    anotar('X-04', 'Hojas auxiliares idénticas a la plantilla (byte a byte)', 'sheet2 a sheet9 sin cambios', iguales ? 'Idénticas' : 'Hay diferencias', iguales);

    anotar('S-01', 'Los datos se guardan en un archivo de base de datos', 'Archivo .db creado con los registros',
      `${path.basename(process.env.SQLITE_PATH)}: ${fs.statSync(process.env.SQLITE_PATH).size} bytes`, fs.existsSync(process.env.SQLITE_PATH));
    // Persistencia real: un proceso nuevo de Node (como cerrar y volver a ejecutar) lee los mismos registros
    const { execFileSync } = require('child_process');
    const salida = execFileSync(process.execPath, ['-e', "require('./src/db').contar().then((n) => console.log(n))"],
      { cwd: path.join(__dirname, '..'), env: process.env }).toString().trim();
    anotar('S-02', 'Persistencia: un proceso nuevo lee los mismos registros', `${lista.length} registros`, `${salida} registros`, Number(salida) === lista.length);
  } catch (e) {
    anotar('ERR', 'Ejecución de pruebas', 'Sin errores', String(e.stack || e), false);
  }
  servidor.close();

  const aprobadas = resultados.filter((x) => x.ok).length;
  const md = ['# Registro de pruebas', '',
    `Fecha de ejecución: ${new Date().toLocaleString('es-PE')}`, '',
    `Resultado: ${aprobadas} de ${resultados.length} pruebas aprobadas`, '',
    'Generado automáticamente con `npm run pruebas` (usa una base de datos temporal).', '',
    '| Código | Prueba | Resultado esperado | Resultado obtenido | Estado |', '| --- | --- | --- | --- | --- |',
    ...resultados.map((x) => `| ${x.codigo} | ${x.prueba} | ${x.esperado} | ${String(x.obtenido).replace(/\|/g, '/')} | ${x.ok ? 'Aprobado' : 'FALLÓ'} |`)].join('\n');
  fs.writeFileSync(path.join(DOCS, 'registro_de_pruebas.md'), md, 'utf8');
  console.log(`\n${aprobadas}/${resultados.length} pruebas aprobadas`);
  process.exit(aprobadas === resultados.length ? 0 : 1);
})();
