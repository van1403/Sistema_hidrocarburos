const router = require('express').Router();
const c = require('../controllers/registrosController');

router.get('/parametros', c.parametros);
router.put('/cabecera', c.guardarCabecera);

router.get('/registros', c.listar);
router.get('/registros/:id', c.obtener);
router.post('/registros', c.crear);
router.put('/registros/:id', c.actualizar);
router.delete('/registros/:id', c.eliminar);

router.get('/exportar-excel', c.exportarExcel);

module.exports = router;
