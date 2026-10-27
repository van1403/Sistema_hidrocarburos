require('dotenv').config({ quiet: true });
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', require('./src/routes/api'));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

module.exports = app;

if (require.main === module) {
  const PUERTO = process.env.PORT || 3000;
  app.listen(PUERTO, () => {
    console.log(`Servidor listo en http://localhost:${PUERTO}  |  Base de datos: ${require('./src/db').nombre}`);
  });
}
