// Inserta 15 registros de prueba generados con los catálogos reales del Excel (oficina Huánuco).
// Uso: npm run semilla     (funciona con SQLite o con Supabase, según DB_DRIVER)
require('dotenv').config({ quiet: true });
const db = require('../src/db');
const cat = require('../src/services/catalogos');
const { validar } = require('../src/services/validacion');

(async () => {
  const cab = await db.getConfig();
  const oficina = cab.oficina || 'Huánuco';
  const acciones = Object.keys(cat.acciones);
  const agentes = Object.keys(cat.agentes);
  const provs = Object.keys(cat.ubicacion[oficina]);
  const empresas = cat.empresas[oficina];
  let creados = 0;
  for (let i = 0; i < 15; i++) {
    const accion = acciones[i % acciones.length];
    const esps = Object.keys(cat.acciones[accion]);
    const esp = esps[i % esps.length];
    const agente = agentes[i % agentes.length];
    const prov = provs[i % provs.length];
    const dists = cat.ubicacion[oficina][prov];
    const r = {
      accion, accion_especifica: esp, sub_accion: cat.acciones[accion][esp][0] || '',
      tipo_agente: agente, actividad: cat.agentes[agente][0], provincia: prov, distrito: dists[i % dists.length],
      transporte: cat.transportes[i % cat.transportes.length], n_supervisores: (i % 3) + 1,
      empresa: empresas[i % empresas.length], calidad: cat.calidades[i % cat.calidades.length],
      expediente_siged: String(202400300000 + i), carta_linea: `${1070000 + i}-1`, observaciones: '',
    };
    const errores = validar(r, oficina);
    if (Object.keys(errores).length) { console.log('Registro omitido:', errores); continue; }
    await db.crear(r);
    creados++;
  }
  console.log(`Registros de prueba creados: ${creados} (base: ${db.nombre})`);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
