// Carga database/catalogos.json (generado desde las hojas auxiliares del Excel)
const path = require('path');
const fs = require('fs');
const RUTA = path.join(__dirname, '..', '..', '..', 'database', 'catalogos.json');

if (!fs.existsSync(RUTA)) {
  throw new Error('No existe database/catalogos.json. Ejecuta: npm run importar');
}
module.exports = JSON.parse(fs.readFileSync(RUTA, 'utf8'));
