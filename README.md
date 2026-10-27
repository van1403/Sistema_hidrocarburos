<<<<<<< HEAD
﻿# servicio-hidrocarburos
=======
# Hydrocarbon monitoring action recording system

Proyecto grupal de SENATI hecho en Visual Studio Code.

Digitaliza la hoja «Registro» del libro `02. Sustento del Detalle de las Acciones de Supervisión de Hidrocarburos 2024 nov.xlsm`: se ingresan los datos en una web, se guardan en una base de datos y un botón genera el Excel a partir de lo guardado.

- Frontend: HTML, CSS y JavaScript
- Backend: Node.js + Express (API REST)
- Base de datos: SQLite (por defecto, con la biblioteca sql.js: no necesita compilar nada) o Supabase (PostgreSQL en la nube)
- Excel: se genera editando la plantilla .xlsm original, así se conservan macros, hojas auxiliares, tablas y validaciones

## 1. Requisitos

- Visual Studio Code
- Node.js LTS (versión 18 o superior). Se revisa con `node -v` y `npm -v` en la terminal.

## 2. Cómo ejecutarlo (SQLite, sin configurar nada)

Abrir la carpeta del proyecto en VS Code y, en la terminal integrada:

```bash
cd backend
npm install
npm start
```

Abrir http://localhost:3000 en el navegador.

La primera vez se crea solo el archivo `database/supervision.db` con las tablas. Los datos se quedan guardados aunque se cierre el programa.

Si se quiere ver el sistema con datos de ejemplo:

```bash
npm run semilla
```

También viene `database/supervision_prueba.db` con 15 registros; para usarla se copia como `database/supervision.db` (con el servidor apagado).

## 3. Usar Supabase en lugar de SQLite

1. Entrar a https://supabase.com, crear una cuenta y un proyecto nuevo (New project). Guardar la contraseña de la base de datos.
2. En el proyecto, abrir SQL Editor > New query, pegar todo el contenido de `database/schema.supabase.sql` y presionar Run. Se crean las tablas `registros` y `configuracion`.
3. Ir a Project Settings > API y copiar:
   - Project URL
   - la clave `service_role` (la que dice «secret»)
4. En la carpeta `backend`, copiar `.env.example` como `.env` y completar:

   ```
   DB_DRIVER=supabase
   SUPABASE_URL=https://TU-PROYECTO.supabase.co
   SUPABASE_SERVICE_KEY=la-clave-service_role
   ```

5. Iniciar con `npm start`. Arriba en la pantalla debe decir «Base de datos: Supabase (PostgreSQL)».
6. Opcional: `npm run semilla` para cargar 15 registros de ejemplo.
7. Para comprobar, en Supabase abrir Table Editor > registros: ahí aparecen los datos que se guardan desde la web.

Importante: la clave `service_role` es secreta. Va solo en `backend/.env`, que está en `.gitignore` y no se sube a GitHub. Nunca se pega en el frontend ni en un mensaje del grupo.

## 4. Subir el proyecto a GitHub

1. En https://github.com crear un repositorio nuevo (New repository), vacío: sin README, sin .gitignore y sin licencia (el proyecto ya los trae).
2. En la terminal de VS Code, en la carpeta raíz del proyecto (donde está este README):

   ```bash
   git init
   git add .
   git commit -m "Proyecto inicial: sistema de supervisión de hidrocarburos"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/supervision-hidrocarburos.git
   git push -u origin main
   ```

3. Revisar en GitHub que no aparezcan `node_modules` ni `.env`.
4. Para el trabajo en equipo: se agregan los compañeros en Settings > Collaborators, y cada integrante hace `git clone`, entra a `backend`, corre `npm install` y crea su propio `.env`. Conviene que cada uno trabaje en su rama (`git checkout -b feature/nombre`) y se junte con Pull Request.

## 5. Estructura de carpetas

```
supervision-hidrocarburos/
  frontend/            index.html, styles.css, app.js
  backend/
    server.js
    src/
      routes/          rutas de la API
      controllers/     lógica de cada ruta
      services/        validaciones, catálogos y exportación a Excel
      db/              driver SQLite y driver Supabase
    scripts/           importar-catalogos.js, semilla.js, pruebas.js
  database/            schema.sql, schema.supabase.sql, catalogos.json, supervision_prueba.db
  plantilla/           plantilla.xlsm (copia del Excel original, sin modificar)
  documentos/          manual, presentación, registro de pruebas y Excel exportado
  README.md
```

## 6. Catálogos (listas desplegables)

Las listas no están inventadas: salen de las hojas del libro. El script `npm run importar` (en `backend`) lee `plantilla/plantilla.xlsm` y genera `database/catalogos.json`.

| Lista | Hoja de origen | Depende de |
| --- | --- | --- |
| Acción | Accion | |
| Acción Específica | AccionEspecifica | Acción |
| Sub Acción Específica | SubAccion | Acción Específica |
| Tipo de Agente y Actividad | ActividadAgente | Tipo de Agente |
| Provincia y Distrito | Base (columnas AD, AF, AJ) | Oficina Regional |
| Empresa Supervisora | Lista de Empresas Supervisoras | Oficina Regional |
| Mes, Transporte, Calidad | Base | |

El archivo `catalogos.json` ya viene generado. Solo hay que volver a correr el importador si cambia la plantilla.

## 7. API REST

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | /api/parametros | Catálogos, cabecera (mes y oficina) y motor de base de datos |
| PUT | /api/cabecera | Cambia el mes y la oficina regional |
| GET | /api/registros | Lista registros. Filtros: q, accion, empresa, provincia, distrito, calidad, expediente |
| GET | /api/registros/:id | Un registro |
| POST | /api/registros | Crea un registro (201) o devuelve errores de validación (400) |
| PUT | /api/registros/:id | Actualiza (200, 400 o 404) |
| DELETE | /api/registros/:id | Elimina (200 o 404) |
| GET | /api/exportar-excel | Descarga el .xlsm generado desde la base de datos |

## 8. Reglas de validación

- Todos los campos son obligatorios, menos Observaciones.
- Cada valor de lista debe existir en el catálogo y corresponder a su lista padre (por ejemplo, la Sub Acción debe ser de la Acción Específica elegida).
- N° de supervisores: entero mayor que cero.
- Expediente SIGED (solo dígitos) y Carta Línea se guardan como texto: no pierden los ceros a la izquierda.
- CONTRATO no se digita: es `LEFT(Empresa Supervisora, 10)`, igual que la fórmula del libro.
- Máximo 931 registros, que son las filas 22 a 952 que la plantilla trae preparadas.

## 9. Estrategia de exportación y limitaciones

Un .xlsm es un ZIP de archivos XML. En lugar de reconstruir el libro con una biblioteca (que puede perder macros y validaciones), el sistema copia `plantilla/plantilla.xlsm`, reemplaza únicamente la hoja «Registro» (cabecera en A3 y A6, datos desde la fila 22) y deja todo lo demás intacto.

Comprobado con las pruebas automáticas:

- el archivo exportado incluye `vbaProject.bin` (macros) y las imágenes;
- tiene las mismas partes que la plantilla (hojas, tablas, validaciones);
- las hojas auxiliares (sheet2 a sheet9) son idénticas byte a byte;
- abre con openpyxl y con LibreOffice, y el número de registros coincide con el del sistema.

Limitaciones que hay que decir en la sustentación:

- No se pudo probar con Microsoft Excel instalado, solo con LibreOffice y openpyxl. Conviene abrir el archivo en Excel antes de entregar.
- Se quita `calcChain.xml` y se activa el recálculo al abrir, así que Excel puede pedir guardar al cerrar.
- Los valores de la hoja se escriben como texto en línea (inline strings), válido en Excel.
- Algunas listas del libro traen un espacio al final (por ejemplo «Regular »). Se respetan tal cual para que coincidan con las listas del Excel.
- Si se cambia la Oficina Regional con registros ya guardados, esos registros siguen con su provincia y empresa anteriores.

## 10. Pruebas

```bash
cd backend
npm run pruebas
```

Corre 39 pruebas contra una base temporal (15 registros válidos, 8 casos de validación, 3 ediciones, 2 eliminaciones, búsqueda, filtro y exportación) y escribe `documentos/registro_de_pruebas.md` y `documentos/Excel_exportado_por_el_sistema.xlsm`.

## 11. Demostración ante el docente (guion)

1. Terminal de VS Code: `cd backend`, `npm start`.
2. Abrir http://localhost:3000, ir a Registro y guardar un caso nuevo usando las listas.
3. En Consultar registros, buscar el registro y editar un dato.
4. Eliminar otro registro con la confirmación.
5. Exportar Excel y abrirlo: verificar la fila registrada y las hojas auxiliares.
6. Cerrar el servidor (Ctrl + C), volver a ejecutar `npm start` y comprobar que los datos siguen.
# Sistema_hidrocarburos
>>>>>>> feature/ruby
