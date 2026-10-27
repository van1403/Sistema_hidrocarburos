const cat = require('./catalogos');

const CAMPOS_TEXTO = ['accion', 'accion_especifica', 'sub_accion', 'tipo_agente', 'actividad', 'provincia', 'distrito',
  'transporte', 'empresa', 'calidad', 'expediente_siged', 'carta_linea'];

const ETIQUETAS = {
  accion: 'Acción', accion_especifica: 'Acción Específica', sub_accion: 'Sub Acción Específica',
  tipo_agente: 'Tipo de Agente', actividad: 'Actividad', provincia: 'Zona (Provincia)', distrito: 'Zona (Distrito)',
  transporte: 'Tipo de Transporte Empleado', n_supervisores: 'N° de Supervisores', empresa: 'Empresa Supervisora',
  calidad: 'Calidad del entregable', expediente_siged: 'N° de Expediente SIGED', carta_linea: 'Carta Línea',
};

// Normaliza los datos recibidos. Los identificadores (SIGED, Carta Línea) siempre son texto.
function normalizar(b) {
  const r = {};
  for (const c of CAMPOS_TEXTO) r[c] = b[c] === undefined || b[c] === null ? '' : String(b[c]);
  r.expediente_siged = r.expediente_siged.trim();
  r.carta_linea = r.carta_linea.trim();
  r.observaciones = b.observaciones === undefined || b.observaciones === null ? '' : String(b.observaciones).trim();
  r.n_supervisores = b.n_supervisores;
  return r;
}

// Devuelve { campo: 'mensaje' } con los errores; vacío si todo está bien
function validar(r, oficina) {
  const e = {};
  for (const c of CAMPOS_TEXTO) {
    if (!String(r[c]).trim()) e[c] = `${ETIQUETAS[c]} es obligatorio.`;
  }

  const n = Number(r.n_supervisores);
  if (r.n_supervisores === '' || r.n_supervisores === undefined || r.n_supervisores === null) {
    e.n_supervisores = `${ETIQUETAS.n_supervisores} es obligatorio.`;
  } else if (!Number.isInteger(n) || n <= 0) {
    e.n_supervisores = 'Debe ser un número entero mayor que cero.';
  }

  // Listas dependientes: Acción → Acción Específica → Sub Acción
  if (!e.accion && !cat.acciones[r.accion]) e.accion = 'La Acción no existe en el catálogo.';
  if (!e.accion && !e.accion_especifica) {
    const esp = cat.acciones[r.accion][r.accion_especifica];
    if (!esp) e.accion_especifica = 'La Acción Específica no corresponde a la Acción elegida.';
    else if (!e.sub_accion && !esp.includes(r.sub_accion)) e.sub_accion = 'La Sub Acción no corresponde a la Acción Específica elegida.';
  }

  // Tipo de Agente → Actividad
  if (!e.tipo_agente && !cat.agentes[r.tipo_agente]) e.tipo_agente = 'El Tipo de Agente no existe en el catálogo.';
  if (!e.tipo_agente && !e.actividad && !cat.agentes[r.tipo_agente].includes(r.actividad)) {
    e.actividad = 'La Actividad no corresponde al Tipo de Agente elegido.';
  }

  // Oficina Regional → Provincia → Distrito
  const provs = cat.ubicacion[oficina] || {};
  if (!e.provincia && !provs[r.provincia]) e.provincia = `La Provincia no pertenece a la oficina regional ${oficina}.`;
  if (!e.provincia && !e.distrito && !provs[r.provincia].includes(r.distrito)) {
    e.distrito = 'El Distrito no corresponde a la Provincia elegida.';
  }

  if (!e.transporte && !cat.transportes.includes(r.transporte)) e.transporte = 'Tipo de transporte no válido.';
  if (!e.calidad && !cat.calidades.includes(r.calidad)) e.calidad = 'Calidad del entregable no válida.';
  if (!e.empresa && !(cat.empresas[oficina] || []).includes(r.empresa)) {
    e.empresa = `La Empresa Supervisora no está en la lista de la oficina regional ${oficina}.`;
  }

  // Identificadores: se guardan como texto para no perder ceros ni formato
  if (!e.expediente_siged && !/^\d+$/.test(r.expediente_siged)) e.expediente_siged = 'Solo dígitos (ej. 202400229005).';
  if (!e.carta_linea && !/^[A-Za-z0-9\-\/\.]+$/.test(r.carta_linea)) e.carta_linea = 'Solo letras, números, guion o barra (ej. 1064353-1).';

  return e;
}

// CONTRATO: misma regla del Excel =IZQUIERDA(Empresa Supervisora;10)
const contrato = (empresa) => String(empresa || '').slice(0, 10);

module.exports = { normalizar, validar, contrato, CAMPOS_TEXTO };
