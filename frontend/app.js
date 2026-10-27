// Frontend: formulario, tabla, filtros y exportación. Se comunica con el backend por fetch().
const $ = (id) => document.getElementById(id);
const API = '/api';
let P = null;            // parámetros (catálogos + cabecera)
let editandoId = null;   // id del registro en edición (null = nuevo)
let aEliminar = null;

const CAMPOS = ['accion', 'accion_especifica', 'sub_accion', 'tipo_agente', 'actividad', 'provincia', 'distrito',
  'transporte', 'n_supervisores', 'empresa', 'calidad', 'expediente_siged', 'carta_linea', 'observaciones'];

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function aviso(texto, mal = false) {
  const a = $('aviso');
  a.textContent = texto;
  a.className = 'aviso ver' + (mal ? ' mal' : '');
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => (a.className = 'aviso'), 3500);
}

async function api(metodo, ruta, cuerpo) {
  const r = await fetch(API + ruta, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(datos.error || 'Error en el servidor'); e.errores = datos.errores; throw e; }
  return datos;
}

// ---------- listas ----------
function llenar(select, valores, textoInicial = '<< Seleccionar >>', actual = '') {
  select.innerHTML = '';
  const o = document.createElement('option');
  o.value = ''; o.textContent = textoInicial;
  select.appendChild(o);
  valores.forEach((v) => {
    const op = document.createElement('option');
    op.value = v; op.textContent = v.trim();
    select.appendChild(op);
  });
  select.value = valores.includes(actual) ? actual : '';
}

function listaEspecificas() { return Object.keys((P.acciones[$('accion').value]) || {}); }
function listaSubs() { return ((P.acciones[$('accion').value] || {})[$('accion_especifica').value]) || []; }
function listaActividades() { return P.agentes[$('tipo_agente').value] || []; }
function ubicacion() { return P.ubicacion[P.cabecera.oficina] || {}; }
function listaDistritos() { return ubicacion()[$('provincia').value] || []; }

function cargarListasBase() {
  llenar($('mes'), P.meses, '', P.cabecera.mes);
  llenar($('oficina'), P.oficinas, '', P.cabecera.oficina);
  llenar($('accion'), Object.keys(P.acciones));
  llenar($('accion_especifica'), []);
  llenar($('sub_accion'), []);
  llenar($('tipo_agente'), Object.keys(P.agentes));
  llenar($('actividad'), []);
  llenar($('provincia'), Object.keys(ubicacion()));
  llenar($('distrito'), []);
  llenar($('transporte'), P.transportes);
  llenar($('empresa'), P.empresas[P.cabecera.oficina] || []);
  llenar($('calidad'), P.calidades);
  // filtros de la tabla
  llenar($('f-accion'), Object.keys(P.acciones), 'Acción: todas');
  llenar($('f-empresa'), P.empresas[P.cabecera.oficina] || [], 'Empresa: todas');
  llenar($('f-provincia'), Object.keys(ubicacion()), 'Provincia: todas');
  llenar($('f-calidad'), P.calidades, 'Calidad: todas');
}

// Dependencias: al cambiar el campo principal se reinician los campos hijos
$('accion').addEventListener('change', () => { llenar($('accion_especifica'), listaEspecificas()); llenar($('sub_accion'), []); });
$('accion_especifica').addEventListener('change', () => llenar($('sub_accion'), listaSubs()));
$('tipo_agente').addEventListener('change', () => llenar($('actividad'), listaActividades()));
$('provincia').addEventListener('change', () => llenar($('distrito'), listaDistritos()));
$('empresa').addEventListener('change', () => ($('contrato').value = $('empresa').value.slice(0, 10)));

async function cambiarCabecera() {
  const nuevo = { mes: $('mes').value, oficina: $('oficina').value };
  const cambioOficina = nuevo.oficina !== P.cabecera.oficina;
  try {
    if (cambioOficina && (await contar()) > 0 &&
        !confirm('Ya hay registros guardados. Al cambiar la Oficina Regional, las provincias y empresas disponibles cambian. ¿Continuar?')) {
      llenar($('oficina'), P.oficinas, '', P.cabecera.oficina);
      return;
    }
    P.cabecera = await api('PUT', '/cabecera', nuevo);
    const g = capturar();
    cargarListasBase();
    if (!cambioOficina) restaurar(g);
    actualizarCabeceraVisible();
    aviso('Cabecera actualizada');
  } catch (e) { aviso(e.message, true); }
}
$('mes').addEventListener('change', cambiarCabecera);
$('oficina').addEventListener('change', cambiarCabecera);

async function contar() { return (await api('GET', '/registros')).length; }

// ---------- formulario ----------
function capturar() { const o = {}; CAMPOS.forEach((c) => (o[c] = $(c).value)); return o; }

function restaurar(d) {
  $('accion').value = d.accion || '';
  llenar($('accion_especifica'), listaEspecificas(), '<< Seleccionar >>', d.accion_especifica);
  llenar($('sub_accion'), listaSubs(), '<< Seleccionar >>', d.sub_accion);
  $('tipo_agente').value = d.tipo_agente || '';
  llenar($('actividad'), listaActividades(), '<< Seleccionar >>', d.actividad);
  $('provincia').value = d.provincia || '';
  llenar($('distrito'), listaDistritos(), '<< Seleccionar >>', d.distrito);
  ['transporte', 'empresa', 'calidad', 'n_supervisores', 'expediente_siged', 'carta_linea', 'observaciones']
    .forEach((c) => ($(c).value = d[c] ?? ''));
  $('contrato').value = ($('empresa').value || '').slice(0, 10);
}

function limpiarErrores() {
  document.querySelectorAll('.error').forEach((s) => (s.textContent = ''));
  document.querySelectorAll('.invalido').forEach((e) => e.classList.remove('invalido'));
}
function mostrarErrores(errores) {
  limpiarErrores();
  Object.entries(errores || {}).forEach(([campo, msg]) => {
    const s = document.querySelector(`[data-error="${campo}"]`);
    if (s) s.textContent = msg;
    if ($(campo)) $(campo).classList.add('invalido');
  });
}

// Validación en el navegador (el servidor valida de nuevo)
function validarLocal(d) {
  const e = {};
  const obligatorios = ['accion', 'accion_especifica', 'sub_accion', 'tipo_agente', 'actividad', 'provincia', 'distrito', 'transporte', 'empresa', 'calidad', 'expediente_siged', 'carta_linea'];
  obligatorios.forEach((c) => { if (!String(d[c]).trim()) e[c] = 'Este campo es obligatorio.'; });
  const n = Number(d.n_supervisores);
  if (d.n_supervisores === '') e.n_supervisores = 'Este campo es obligatorio.';
  else if (!Number.isInteger(n) || n <= 0) e.n_supervisores = 'Debe ser un número entero mayor que cero.';
  if (!e.expediente_siged && !/^\d+$/.test(d.expediente_siged.trim())) e.expediente_siged = 'Solo dígitos (ej. 202400229005).';
  if (!e.carta_linea && !/^[A-Za-z0-9\-\/\.]+$/.test(d.carta_linea.trim())) e.carta_linea = 'Solo letras, números, guion o barra.';
  return e;
}

function nuevoFormulario() {
  editandoId = null;
  $('form').reset();
  limpiarErrores();
  cargarListasBase();
  $('contrato').value = '';
  $('titulo-form').textContent = 'Nuevo registro';
  $('btn-guardar').textContent = 'Guardar';
  $('btn-cancelar').classList.add('oculto');
}

$('form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const datos = capturar();
  const locales = validarLocal(datos);
  if (Object.keys(locales).length) { mostrarErrores(locales); aviso('Revisa los campos marcados', true); return; }
  limpiarErrores();
  try {
    if (editandoId) { await api('PUT', `/registros/${editandoId}`, datos); aviso('Registro actualizado'); }
    else { await api('POST', '/registros', datos); aviso('Registro guardado'); }
    const eraEdicion = !!editandoId;
    nuevoFormulario();
    if (eraEdicion) irA('consultar');
    refrescarResumen();
  } catch (e) {
    if (e.errores) mostrarErrores(e.errores);
    aviso(e.message, true);
  }
});
$('btn-limpiar').addEventListener('click', () => { nuevoFormulario(); });
$('btn-cancelar').addEventListener('click', () => { nuevoFormulario(); irA('consultar'); });

// ---------- tabla ----------
function params() {
  const q = new URLSearchParams();
  if ($('f-q').value.trim()) q.set('q', $('f-q').value.trim());
  if ($('f-accion').value) q.set('accion', $('f-accion').value);
  if ($('f-empresa').value) q.set('empresa', $('f-empresa').value);
  if ($('f-provincia').value) q.set('provincia', $('f-provincia').value);
  if ($('f-calidad').value) q.set('calidad', $('f-calidad').value);
  return q.toString();
}
let cache = [];
async function cargarTabla() {
  cache = await api('GET', '/registros' + (params() ? '?' + params() : ''));
  const total = (await api('GET', '/registros')).length;
  $('conteo').textContent = `${cache.length} registro(s) mostrados de ${total} guardados`;
  $('tbody').innerHTML = cache.length ? cache.map((r, i) => {
    const cl = r.calidad.trim() === 'Buena' ? '' : r.calidad.trim() === 'Regular' ? 'regular' : 'mala';
    return `<tr>
      <td>${i + 1}</td><td>${esc(r.accion)}</td><td>${esc(r.accion_especifica)}</td><td>${esc(r.sub_accion)}</td>
      <td>${esc(r.tipo_agente)}</td><td>${esc(r.actividad)}</td><td>${esc(r.provincia)} / ${esc(r.distrito)}</td>
      <td>${esc(r.transporte)}</td><td>${r.n_supervisores}</td><td>${esc(r.contrato)}</td>
      <td><span class="etq ${cl}">${esc(r.calidad.trim())}</span></td><td>${esc(r.expediente_siged)}</td>
      <td>${esc(r.carta_linea)}</td><td>${esc(r.observaciones)}</td>
      <td class="acciones"><button data-editar="${r.id}">Editar</button> <button data-eliminar="${r.id}">Eliminar</button></td></tr>`;
  }).join('') : '<tr><td colspan="15" class="vacio">No hay registros para mostrar.</td></tr>';
}
['f-q', 'f-accion', 'f-empresa', 'f-provincia', 'f-calidad'].forEach((id) => $(id).addEventListener('input', cargarTabla));
$('f-limpiar').addEventListener('click', () => {
  ['f-q', 'f-accion', 'f-empresa', 'f-provincia', 'f-calidad'].forEach((id) => ($(id).value = ''));
  cargarTabla();
});

$('tbody').addEventListener('click', (ev) => {
  const ed = ev.target.dataset.editar, el = ev.target.dataset.eliminar;
  if (ed) {
    const r = cache.find((x) => x.id === Number(ed));
    editandoId = r.id;
    irA('registro');
    cargarListasBase();
    restaurar(r);
    limpiarErrores();
    $('titulo-form').textContent = `Editando registro (id ${r.id})`;
    $('btn-guardar').textContent = 'Guardar cambios';
    $('btn-cancelar').classList.remove('oculto');
  }
  if (el) {
    const r = cache.find((x) => x.id === Number(el));
    aEliminar = r.id;
    $('dlg-texto').textContent = `${r.accion_especifica} · Expediente ${r.expediente_siged}. Esta acción no se puede deshacer.`;
    $('dlg-eliminar').showModal();
  }
});
$('dlg-eliminar').addEventListener('close', async () => {
  if ($('dlg-eliminar').returnValue !== 'ok' || !aEliminar) return;
  try { await api('DELETE', `/registros/${aEliminar}`); aviso('Registro eliminado'); }
  catch (e) { aviso(e.message, true); }
  aEliminar = null;
  cargarTabla(); refrescarResumen();
});

// ---------- exportar ----------
$('btn-exportar').addEventListener('click', async () => {
  $('exp-msg').textContent = 'Generando archivo…';
  try {
    const r = await fetch(API + '/exportar-excel');
    if (!r.ok) throw new Error((await r.json()).error || 'No se pudo exportar');
    const blob = await r.blob();
    const nombre = (r.headers.get('Content-Disposition') || '').match(/filename="(.+)"/)?.[1] || 'reporte.xlsm';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nombre; a.click();
    URL.revokeObjectURL(a.href);
    $('exp-msg').textContent = `Listo: se descargó ${nombre} con ${r.headers.get('X-Total-Registros')} registro(s).`;
  } catch (e) { $('exp-msg').textContent = ''; aviso(e.message, true); }
});

// ---------- navegación ----------
function irA(vista) {
  document.querySelectorAll('.vista').forEach((v) => v.classList.toggle('activa', v.id === `vista-${vista}`));
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('activo', b.dataset.vista === vista));
  if (vista === 'consultar') cargarTabla();
  if (vista === 'exportar' || vista === 'inicio') refrescarResumen();
  window.scrollTo(0, 0);
}
document.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => irA(b.dataset.vista)));
document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => irA(b.dataset.ir)));

function actualizarCabeceraVisible() {
  $('subtitulo').textContent = `Oficina Regional ${P.cabecera.oficina} · ${P.cabecera.mes} · Base de datos: ${P.motor}`;
  $('exp-mes').textContent = P.cabecera.mes;
  $('exp-oficina').textContent = P.cabecera.oficina;
}
async function refrescarResumen() {
  try {
    const n = (await api('GET', '/registros')).length;
    $('resumen').textContent = `Registros guardados: ${n} de ${P.maxRegistros} que admite la plantilla.`;
    $('exp-total').textContent = n;
  } catch (e) { /* sin conexión con el servidor */ }
}

(async function iniciar() {
  try {
    P = await api('GET', '/parametros');
    cargarListasBase();
    actualizarCabeceraVisible();
    refrescarResumen();
  } catch (e) {
    $('subtitulo').textContent = 'No se pudo conectar con el servidor. ¿Está corriendo "npm start"?';
    aviso(e.message, true);
  }
})();
