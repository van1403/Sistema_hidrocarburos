// Frontend: form, table, filters and export. Communicates with the backend via fetch().
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
  const btn = $('btn-guardar');
  btn.disabled = true;
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
  } finally {
    btn.disabled = false;
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
let orden = { campo: 'n', dir: 1 };
let periodo = 'todo';

// Fecha de creación del registro (SQLite la guarda como "AAAA-MM-DD hh:mm:ss" en UTC; Supabase como ISO)
function fechaDe(r) {
  const t = String(r.created_at || '');
  if (!t) return null;
  const d = new Date(t.includes('T') ? t : t.replace(' ', 'T') + 'Z');
  return isNaN(d) ? null : d;
}
function enPeriodo(r) {
  if (periodo === 'todo') return true;
  const f = fechaDe(r);
  if (!f) return false;
  const hoy = new Date();
  const ref = periodo === 'mes' ? new Date(hoy.getFullYear(), hoy.getMonth(), 1) : new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  return f.getFullYear() === ref.getFullYear() && f.getMonth() === ref.getMonth();
}
function valorOrden(r, campo) {
  if (campo === 'n') return r.numero;
  if (campo === 'ubicacion') return `${r.provincia} ${r.distrito}`.toLowerCase();
  return String(r[campo] ?? '').trim().toLowerCase();
}

async function cargarTabla() {
  const todos = await api('GET', '/registros');
  const numeros = Object.fromEntries(todos.map((r, i) => [r.id, i + 1]));
  cache = (await api('GET', '/registros' + (params() ? '?' + params() : '')))
    .map((r) => ({ ...r, numero: numeros[r.id] }))
    .filter(enPeriodo)
    .sort((a, b) => {
      const x = valorOrden(a, orden.campo), y = valorOrden(b, orden.campo);
      return (x < y ? -1 : x > y ? 1 : 0) * orden.dir;
    });
  const nombrePeriodo = { todo: '', mes: ' · este mes', anterior: ' · mes anterior' }[periodo];
  $('conteo').textContent = `${cache.length} registro(s) mostrados de ${todos.length} guardados${nombrePeriodo}`;
  $('tbody').innerHTML = cache.length ? cache.map((r) => {
    const cl = r.calidad.trim() === 'Buena' ? '' : r.calidad.trim() === 'Regular' ? 'regular' : 'mala';
    return `<tr>
      <td>${r.numero}</td><td>${esc(r.accion_especifica)}</td><td>${esc(r.sub_accion)}</td>
      <td>${esc(r.provincia)} / ${esc(r.distrito)}</td><td>${esc(r.contrato)}</td>
      <td><span class="etq ${cl}">${esc(r.calidad.trim())}</span></td><td>${esc(r.expediente_siged)}</td>
      <td class="acciones"><button class="btn-ver" data-ver="${r.id}">Ver</button> <button data-editar="${r.id}">Editar</button> <button data-duplicar="${r.id}">Duplicar</button> <button data-eliminar="${r.id}">Eliminar</button></td></tr>`;
  }).join('') : '<tr><td colspan="8" class="vacio">No hay registros para mostrar con estos filtros.</td></tr>';
  document.querySelectorAll('th[data-orden]').forEach((th) => {
    th.classList.toggle('asc', th.dataset.orden === orden.campo && orden.dir === 1);
    th.classList.toggle('desc', th.dataset.orden === orden.campo && orden.dir === -1);
  });
}

// Ordenar al hacer clic en un título de columna
document.querySelectorAll('th[data-orden]').forEach((th) => th.addEventListener('click', () => {
  orden = { campo: th.dataset.orden, dir: orden.campo === th.dataset.orden ? -orden.dir : 1 };
  cargarTabla();
}));
// Filtro por periodo
document.querySelectorAll('[data-periodo]').forEach((b) => b.addEventListener('click', () => {
  periodo = b.dataset.periodo;
  document.querySelectorAll('[data-periodo]').forEach((x) => x.classList.toggle('on', x === b));
  cargarTabla();
}));
['f-q', 'f-accion', 'f-empresa', 'f-provincia', 'f-calidad'].forEach((id) => $(id).addEventListener('input', cargarTabla));
$('f-limpiar').addEventListener('click', () => {
  ['f-q', 'f-accion', 'f-empresa', 'f-provincia', 'f-calidad'].forEach((id) => ($(id).value = ''));
  periodo = 'todo';
  document.querySelectorAll('[data-periodo]').forEach((x) => x.classList.toggle('on', x.dataset.periodo === 'todo'));
  cargarTabla();
});

$('tbody').addEventListener('click', (ev) => {
  const ed = ev.target.dataset.editar, el = ev.target.dataset.eliminar;
  const ve = ev.target.dataset.ver, du = ev.target.dataset.duplicar;
  if (ve) {
    const r = cache.find((x) => x.id === Number(ve));
    const filas = [['Acción', r.accion], ['Acción Específica', r.accion_especifica], ['Sub Acción', r.sub_accion],
      ['Tipo de Agente', r.tipo_agente], ['Actividad', r.actividad], ['Provincia', r.provincia], ['Distrito', r.distrito],
      ['Transporte', r.transporte], ['N° de Supervisores', r.n_supervisores], ['Empresa Supervisora', r.empresa],
      ['Contrato', r.contrato], ['Calidad del entregable', r.calidad.trim()], ['Expediente SIGED', r.expediente_siged],
      ['Carta Línea', r.carta_linea], ['Observaciones', r.observaciones || '—']];
    $('ver-detalle').innerHTML = filas.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
    $('dlg-ver').showModal();
  }
  if (du) {
    // Copia el registro al formulario como nuevo; el expediente y la carta se dejan vacíos para escribirlos
    const r = cache.find((x) => x.id === Number(du));
    editandoId = null;
    irA('registro');
    cargarListasBase();
    restaurar({ ...r, expediente_siged: '', carta_linea: '' });
    limpiarErrores();
    $('titulo-form').textContent = 'Nuevo registro (copia de otro)';
    $('btn-guardar').textContent = 'Guardar';
    $('btn-cancelar').classList.remove('oculto');
    aviso('Copia lista: escribe el nuevo expediente y la carta línea');
  }
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
$('ver-cerrar').addEventListener('click', () => $('dlg-ver').close());
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
  $('subtitulo').textContent = `Registro de acciones · Oficina Regional ${P.cabecera.oficina}`;
  $('st-mes').textContent = P.cabecera.mes;
  $('st-oficina').textContent = P.cabecera.oficina;
  $('pie-db').textContent = `Base de datos: ${P.motor}`;
  $('exp-mes').textContent = P.cabecera.mes;
  $('exp-oficina').textContent = P.cabecera.oficina;
}

function graficos(lista) {
  if (!lista.length) {
    const vacio = '<p class="ayuda">Aún no hay datos para graficar.</p>';
    $('graf-acciones').innerHTML = vacio;
    $('graf-calidad').innerHTML = vacio;
    return;
  }
  // Barras: registros por acción
  const porAccion = {};
  lista.forEach((r) => { porAccion[r.accion] = (porAccion[r.accion] || 0) + 1; });
  const filas = Object.entries(porAccion).sort((a, b) => b[1] - a[1]);
  const max = filas[0][1];
  $('graf-acciones').innerHTML = filas.map(([nombre, n]) =>
    `<div class="barra-fila"><span>${esc(nombre)}</span><div class="pista"><div class="rel" style="width:${Math.round((n / max) * 100)}%"></div></div><b>${n}</b></div>`).join('');
  // Dona: calidad del entregable
  const cal = { Buena: 0, Regular: 0, Mala: 0 };
  lista.forEach((r) => { const k = r.calidad.trim(); if (k in cal) cal[k]++; });
  const colores = { Buena: '#16835d', Regular: '#e0a81f', Mala: '#bd3d37' };
  let acum = 0;
  const tramos = Object.entries(cal).filter(([, n]) => n > 0).map(([k, n]) => {
    const ini = acum; acum += (n / lista.length) * 100;
    return `${colores[k]} ${ini}% ${acum}%`;
  }).join(', ');
  $('graf-calidad').innerHTML = `<div class="dona-caja"><div class="dona" style="background: conic-gradient(${tramos})"><b>${lista.length}</b></div>
    <div class="leyenda">${Object.entries(cal).map(([k, n]) => `<span><i style="background:${colores[k]}"></i>${k} · ${n}</span>`).join('')}</div></div>`;
}

async function refrescarResumen() {
  try {
    const lista = await api('GET', '/registros');
    const n = lista.length;
    $('st-total').textContent = n;
    $('st-cap').textContent = `de ${P.maxRegistros} que admite la plantilla`;
    $('exp-total').textContent = n;
    if (n === 0) $('exp-msg').textContent = 'Todavía no hay registros: el archivo saldrá con la hoja Registro vacía.';
    graficos(lista);
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