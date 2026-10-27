// Driver SQLite (por defecto) con sql.js: SQLite compilado a WebAssembly, no necesita compilar nada al instalar.
// La base vive en memoria y se guarda en el archivo database/supervision.db después de cada cambio.
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const CARPETA = path.join(__dirname, '..', '..', '..', 'database');
const RUTA_DB = process.env.SQLITE_PATH || path.join(CARPETA, 'supervision.db');

const CAMPOS = ['accion', 'accion_especifica', 'sub_accion', 'tipo_agente', 'actividad', 'provincia', 'distrito',
  'transporte', 'n_supervisores', 'empresa', 'calidad', 'expediente_siged', 'carta_linea', 'observaciones'];

function crear() {
  let db;
  const listo = (async () => {
    const SQL = await initSqlJs();
    db = fs.existsSync(RUTA_DB) ? new SQL.Database(fs.readFileSync(RUTA_DB)) : new SQL.Database();
    db.exec(fs.readFileSync(path.join(CARPETA, 'schema.sql'), 'utf8'));
    guardar();
  })();

  // Guarda el archivo de forma segura (escribe un temporal y lo renombra)
  function guardar() {
    const tmp = `${RUTA_DB}.tmp`;
    fs.writeFileSync(tmp, Buffer.from(db.export()));
    fs.renameSync(tmp, RUTA_DB);
  }
  function filas(sql, params = []) {
    const st = db.prepare(sql);
    st.bind(params);
    const out = [];
    while (st.step()) out.push(st.getAsObject());
    st.free();
    return out;
  }
  const valores = (r) => CAMPOS.map((c) => (r[c] === undefined ? null : r[c]));

  return {
    nombre: `SQLite (${path.basename(RUTA_DB)})`,
    async listar() { await listo; return filas('SELECT * FROM registros ORDER BY id'); },
    async obtener(id) { await listo; return filas('SELECT * FROM registros WHERE id = ?', [id])[0] || null; },
    async contar() { await listo; return filas('SELECT COUNT(*) AS n FROM registros')[0].n; },
    async crear(r) {
      await listo;
      db.run(`INSERT INTO registros (${CAMPOS.join(',')}) VALUES (${CAMPOS.map(() => '?').join(',')})`, valores(r));
      const id = filas('SELECT last_insert_rowid() AS id')[0].id;
      guardar();
      return filas('SELECT * FROM registros WHERE id = ?', [id])[0];
    },
    async actualizar(id, r) {
      await listo;
      db.run(`UPDATE registros SET ${CAMPOS.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`, [...valores(r), id]);
      if (db.getRowsModified() === 0) return null;
      guardar();
      return filas('SELECT * FROM registros WHERE id = ?', [id])[0];
    },
    async eliminar(id) {
      await listo;
      db.run('DELETE FROM registros WHERE id = ?', [id]);
      const ok = db.getRowsModified() > 0;
      if (ok) guardar();
      return ok;
    },
    async getConfig() {
      await listo;
      return Object.fromEntries(filas('SELECT clave, valor FROM configuracion').map((f) => [f.clave, f.valor]));
    },
    async setConfig(clave, valor) {
      await listo;
      db.run('INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor', [clave, valor]);
      guardar();
    },
  };
}
module.exports = { crear };
