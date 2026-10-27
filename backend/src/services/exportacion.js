// Genera el Excel a partir de la plantilla .xlsm modificando directamente el XML de la hoja «Registro».
// Así se conservan: macros (vbaProject.bin), hojas auxiliares ocultas, tablas, validaciones, estilos e imágenes.
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const { contrato } = require('./validacion');

const PLANTILLA = path.join(__dirname, '..', '..', '..', 'plantilla', 'plantilla.xlsm');
const FILA_INICIAL = 22;   // primera fila de datos (el encabezado está en la 21)
const FILA_FINAL = 952;    // última fila preparada en la plantilla (tabla Tabla5)
const MAX_REGISTROS = FILA_FINAL - FILA_INICIAL + 1;

const esc = (t) => String(t)
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const celdaTexto = (ref, estilo, texto) =>
  `<c r="${ref}"${estilo}${texto === '' ? '/>' : ` t="inlineStr"><is><t xml:space="preserve">${esc(texto)}</t></is></c>`}`;
const celdaNumero = (ref, estilo, n) => `<c r="${ref}"${estilo}><v>${n}</v></c>`;

async function exportar(registros, cabecera) {
  if (registros.length > MAX_REGISTROS) {
    throw new Error(`La plantilla admite como máximo ${MAX_REGISTROS} registros.`);
  }
  const zip = await JSZip.loadAsync(fs.readFileSync(PLANTILLA));

  // --- Hoja Registro (sheet1.xml) ---
  let xml = await zip.file('xl/worksheets/sheet1.xml').async('string');

  // Cabecera: Mes que presenta (A3) y Oficina Regional (A6)
  const poner = (ref, texto) => {
    const re = new RegExp(`<c r="${ref}"([^>]*?)(/>|>.*?</c>)`, 's');
    xml = xml.replace(re, (m, attrs) => {
      const estilo = (attrs.match(/\ss="\d+"/) || [''])[0];
      return celdaTexto(ref, estilo, texto);
    });
  };
  poner('A3', cabecera.mes);
  poner('A6', cabecera.oficina);

  // Filas de datos (A..N = campos, O = CONTRATO calculado)
  const columnas = ['accion', 'accion_especifica', 'sub_accion', 'tipo_agente', 'actividad', 'provincia', 'distrito',
    'transporte', 'n_supervisores', 'empresa', 'calidad', 'expediente_siged', 'carta_linea', 'observaciones'];
  const letras = 'ABCDEFGHIJKLMN'.split('');

  xml = xml.replace(/<row r="(\d+)"([^>]*)>(.*?)<\/row>/gs, (fila, num, attrs, cuerpo) => {
    const n = Number(num);
    if (n < FILA_INICIAL || n > FILA_FINAL) return fila;
    const reg = registros[n - FILA_INICIAL];
    const nuevo = cuerpo.replace(/<c r="([A-Z]+)\d+"([^>]*?)(\/>|>.*?<\/c>)/gs, (celda, col, atributos, resto) => {
      const estilo = (atributos.match(/\ss="\d+"/) || [''])[0];
      const ref = `${col}${n}`;
      const idx = letras.indexOf(col);
      if (idx >= 0) {
        if (!reg) return celdaTexto(ref, estilo, '');
        const v = reg[columnas[idx]];
        return columnas[idx] === 'n_supervisores'
          ? celdaNumero(ref, estilo, Number(v))
          : celdaTexto(ref, estilo, v === null || v === undefined ? '' : String(v));
      }
      if (col === 'O') {
        // CONTRATO: se conserva como fórmula, igual que en el libro de referencia
        if (reg) return `<c r="${ref}"${estilo} t="str"><f>LEFT(J${n},10)</f><v>${esc(contrato(reg.empresa))}</v></c>`;
        return /<f>/.test(resto) ? `<c r="${ref}"${estilo} t="str"><f>LEFT(J${n},10)</f><v></v></c>` : celda;
      }
      return celda;
    });
    return `<row r="${num}"${attrs}>${nuevo}</row>`;
  });
  zip.file('xl/worksheets/sheet1.xml', xml);

  // Forzar recálculo al abrir y quitar calcChain (Excel lo reconstruye solo)
  let wb = await zip.file('xl/workbook.xml').async('string');
  wb = wb.replace(/<calcPr[^>]*\/>/, '<calcPr calcId="191029" fullCalcOnLoad="1"/>');
  zip.file('xl/workbook.xml', wb);
  if (zip.file('xl/calcChain.xml')) {
    zip.remove('xl/calcChain.xml');
    let ct = await zip.file('[Content_Types].xml').async('string');
    ct = ct.replace(/<Override[^>]*calcChain[^>]*\/>/, '');
    zip.file('[Content_Types].xml', ct);
    let rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
    rels = rels.replace(/<Relationship [^>]*calcChain[^>]*\/>/, '');
    zip.file('xl/_rels/workbook.xml.rels', rels);
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

module.exports = { exportar, MAX_REGISTROS };
