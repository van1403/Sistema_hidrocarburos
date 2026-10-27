-- Esquema SQLite: se ejecuta automáticamente al iniciar el servidor
CREATE TABLE IF NOT EXISTS registros (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  accion            TEXT NOT NULL,
  accion_especifica TEXT NOT NULL,
  sub_accion        TEXT NOT NULL,
  tipo_agente       TEXT NOT NULL,
  actividad         TEXT NOT NULL,
  provincia         TEXT NOT NULL,
  distrito          TEXT NOT NULL,
  transporte        TEXT NOT NULL,
  n_supervisores    INTEGER NOT NULL CHECK (n_supervisores > 0),
  empresa           TEXT NOT NULL,
  calidad           TEXT NOT NULL,
  expediente_siged  TEXT NOT NULL,   -- texto: se conserva el formato original
  carta_linea       TEXT NOT NULL,   -- texto: se conserva el formato original
  observaciones     TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cabecera de la hoja Registro (Mes que presenta / Oficina Regional)
CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
INSERT OR IGNORE INTO configuracion (clave, valor) VALUES ('mes', 'Noviembre');
INSERT OR IGNORE INTO configuracion (clave, valor) VALUES ('oficina', 'Huánuco');
