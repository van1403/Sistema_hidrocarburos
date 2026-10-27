const db = require('../db');
const cat = require('../services/catalogos');
const { normalizar, validar, contrato } = require('../services/validacion');
const { exportar, MAX_REGISTROS } = require('../services/exportacion');

const conContrato = (r) => ({ ...r, contrato: contrato(r.empresa) });
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: 'Error interno del servidor.', detalle: e.message });
});

async function cabecera() {
  const c = await db.getConfig();
  return { mes: c.mes || 'Noviembre', oficina: c.oficina || 'Huánuco' };
}

// GET /api/parametros
exports.parametros = wrap(async (req, res) => {
  res.json({ ...cat, cabecera: await cabecera(), maxRegistros: MAX_REGISTROS, motor: db.nombre });
});

// PUT /api/cabecera  { mes, oficina }
exports.guardarCabecera = wrap(async (req, res) => {
  const { mes, oficina } = req.body || {};
  if (!cat.meses.includes(mes)) return res.status(400).json({ error: 'Mes no válido.' });
  if (!cat.oficinas.includes(oficina)) return res.status(400).json({ error: 'Oficina Regional no válida.' });
  await db.setConfig('mes', mes);
  await db.setConfig('oficina', oficina);
  res.json({ mes, oficina });
});

// GET /api/registros?q=&accion=&empresa=&provincia=&distrito=&calidad=&expediente=
exports.listar = wrap(async (req, res) => {
  const { q, accion, empresa, provincia, distrito, calidad, expediente } = req.query;
  const incluye = (campo, buscado) => String(campo || '').toLowerCase().includes(String(buscado).toLowerCase());
  let datos = (await db.listar()).map(conContrato);
  if (accion) datos = datos.filter((r) => r.accion === accion);
  if (empresa) datos = datos.filter((r) => r.empresa === empresa);
  if (provincia) datos = datos.filter((r) => r.provincia === provincia);
  if (distrito) datos = datos.filter((r) => r.distrito === distrito);
  if (calidad) datos = datos.filter((r) => r.calidad === calidad);
  if (expediente) datos = datos.filter((r) => incluye(r.expediente_siged, expediente));
  if (q) {
    datos = datos.filter((r) => ['expediente_siged', 'carta_linea', 'empresa', 'observaciones', 'accion_especifica',
      'sub_accion', 'tipo_agente', 'actividad', 'distrito'].some((c) => incluye(r[c], q)));
  }
  res.json(datos);
});

// GET /api/registros/:id
exports.obtener = wrap(async (req, res) => {
  const r = await db.obtener(Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Registro no encontrado.' });
  res.json(conContrato(r));
});

// POST /api/registros
exports.crear = wrap(async (req, res) => {
  const { oficina } = await cabecera();
  const datos = normalizar(req.body || {});
  const errores = validar(datos, oficina);
  if (Object.keys(errores).length) return res.status(400).json({ error: 'Datos no válidos.', errores });
  if ((await db.contar()) >= MAX_REGISTROS) {
    return res.status(409).json({ error: `Se alcanzó el máximo de ${MAX_REGISTROS} registros que admite la plantilla.` });
  }
  const creado = await db.crear({ ...datos, n_supervisores: Number(datos.n_supervisores) });
  res.status(201).json(conContrato(creado));
});

// PUT /api/registros/:id
exports.actualizar = wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await db.obtener(id))) return res.status(404).json({ error: 'Registro no encontrado.' });
  const { oficina } = await cabecera();
  const datos = normalizar(req.body || {});
  const errores = validar(datos, oficina);
  if (Object.keys(errores).length) return res.status(400).json({ error: 'Datos no válidos.', errores });
  const act = await db.actualizar(id, { ...datos, n_supervisores: Number(datos.n_supervisores) });
  res.json(conContrato(act));
});

// DELETE /api/registros/:id
exports.eliminar = wrap(async (req, res) => {
  const ok = await db.eliminar(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Registro no encontrado.' });
  res.json({ eliminado: true });
});

// GET /api/exportar-excel
exports.exportarExcel = wrap(async (req, res) => {
  const registros = await db.listar();
  const cab = await cabecera();
  const buffer = await exportar(registros, cab);
  res.setHeader('Content-Type', 'application/vnd.ms-excel.sheet.macroEnabled.12');
  res.setHeader('Content-Disposition', `attachment; filename="Sustento_Supervision_Hidrocarburos_${cab.mes}.xlsm"`);
  res.setHeader('X-Total-Registros', String(registros.length));
  res.send(buffer);
});
