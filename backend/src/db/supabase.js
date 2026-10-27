// Driver Supabase (PostgreSQL en la nube). Se activa con DB_DRIVER=supabase en backend/.env
const { createClient } = require('@supabase/supabase-js');

function crear() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_KEY en backend/.env');
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

  return {
    nombre: 'Supabase (PostgreSQL)',
    async listar() { return ok(await sb.from('registros').select('*').order('id', { ascending: true })); },
    async obtener(id) { return ok(await sb.from('registros').select('*').eq('id', id).maybeSingle()); },
    async contar() {
      const { count, error } = await sb.from('registros').select('*', { count: 'exact', head: true });
      if (error) throw new Error(error.message);
      return count;
    },
    async crear(r) { return ok(await sb.from('registros').insert(r).select().single()); },
    async actualizar(id, r) {
      return ok(await sb.from('registros').update({ ...r, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle());
    },
    async eliminar(id) {
      const data = ok(await sb.from('registros').delete().eq('id', id).select('id'));
      return data.length > 0;
    },
    async getConfig() {
      const filas = ok(await sb.from('configuracion').select('clave, valor'));
      return Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
    },
    async setConfig(clave, valor) { ok(await sb.from('configuracion').upsert({ clave, valor })); },
  };
}
module.exports = { crear };
