# Registro de pruebas

Fecha de ejecución: 27/10/2026, 12:19:50 a. m.

Resultado: 39 de 39 pruebas aprobadas

Generado automáticamente con `npm run pruebas` (usa una base de datos temporal).

| Código | Prueba | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- |
| P-01 | Cargar parámetros desde el Excel | Catálogos y cabecera Noviembre / Huánuco | 25 oficinas, 4 acciones, cabecera Noviembre / Huánuco | Aprobado |
| R-01 | Crear registro válido #1 (1.1 RHO en toda la cadena) | HTTP 201 y CONTRATO calculado | HTTP 201, contrato ERH-ESPECI | Aprobado |
| R-02 | Crear registro válido #2 (2.2 RIC) | HTTP 201 y CONTRATO calculado | HTTP 201, contrato SUP2400176 | Aprobado |
| R-03 | Crear registro válido #3 (3.2 Seguridad de LV GLP - Revalidación) | HTTP 201 y CONTRATO calculado | HTTP 201, contrato SUP2400158 | Aprobado |
| R-04 | Crear registro válido #4 (4.4 Ctrol Peso GLP envasado plantas u otros centros distrib. o comerc.) | HTTP 201 y CONTRATO calculado | HTTP 201, contrato SUP2400198 | Aprobado |
| R-05 | Crear registro válido #5 (1.5 Denuncias) | HTTP 201 y CONTRATO calculado | HTTP 201, contrato ERH-ESPECI | Aprobado |
| R-06 | Crear registro válido #6 (2.6 SPIC) | HTTP 201 y CONTRATO calculado | HTTP 201, contrato SUP2400176 | Aprobado |
| R-07 | Crear registro válido #7 (3.6 Demás agentes (CDMV, Transp Acuático, CM y otros)) | HTTP 201 y CONTRATO calculado | HTTP 201, contrato SUP2400158 | Aprobado |
| R-08 | Crear registro válido #8 (4.8 Calidad fuera del registro de hidrocarburos ) | HTTP 201 y CONTRATO calculado | HTTP 201, contrato SUP2400198 | Aprobado |
| R-09 | Crear registro válido #9 (1.4 Actas pruebas y conformidad) | HTTP 201 y CONTRATO calculado | HTTP 201, contrato ERH-ESPECI | Aprobado |
| R-10 | Crear registro válido #10 (2.10 Minería ilegal) | HTTP 201 y CONTRATO calculado | HTTP 201, contrato SUP2400176 | Aprobado |
| R-11 | Crear registro válido #11 (3.10 MT - GLP en cilindros) | HTTP 201 y CONTRATO calculado | HTTP 201, contrato SUP2400158 | Aprobado |
| R-12 | Crear registro válido #12 (4.4 Ctrol Peso GLP envasado plantas u otros centros distrib. o comerc.) | HTTP 201 y CONTRATO calculado | HTTP 201, contrato SUP2400198 | Aprobado |
| R-13 | Crear registro válido #13 (1.3 Certificado para GNV, GNC, GNL) | HTTP 201 y CONTRATO calculado | HTTP 201, contrato ERH-ESPECI | Aprobado |
| R-14 | Crear registro válido #14 (2.2 RIC) | HTTP 201 y CONTRATO calculado | HTTP 201, contrato SUP2400176 | Aprobado |
| R-15 | Crear registro válido #15 (3.14 Emergencias) | HTTP 201 y CONTRATO calculado | HTTP 201, contrato SUP2400158 | Aprobado |
| V-01 | Campos obligatorios vacíos | HTTP 400 con error en: accion, empresa, n_supervisores | HTTP 400 | Aprobado |
| V-02 | N° de supervisores = 0 | HTTP 400 con error en: n_supervisores | HTTP 400 | Aprobado |
| V-03 | N° de supervisores no numérico | HTTP 400 con error en: n_supervisores | HTTP 400 | Aprobado |
| V-04 | Acción Específica de otra Acción | HTTP 400 con error en: accion_especifica | HTTP 400 | Aprobado |
| V-05 | Valor inventado fuera del catálogo (empresa) | HTTP 400 con error en: empresa | HTTP 400 | Aprobado |
| V-06 | Distrito que no pertenece a la provincia | HTTP 400 con error en: distrito | HTTP 400 | Aprobado |
| V-07 | Expediente SIGED con letras | HTTP 400 con error en: expediente_siged | HTTP 400 | Aprobado |
| V-08 | Expediente SIGED conserva ceros a la izquierda | 000123456789 | 000123456789 | Aprobado |
| C-01 | Consultar todos los registros | 15 registros | 15 registros | Aprobado |
| C-02 | Buscar por expediente 202400229003 | 1 registro | 1 registro(s) | Aprobado |
| C-03 | Filtrar por Acción | 4 registro(s) | 4 registro(s) | Aprobado |
| E-01 | Editar registro id 1 y comprobar que persiste | HTTP 200 y datos nuevos al releer | HTTP 200, supervisores 5 | Aprobado |
| E-02 | Editar registro id 2 y comprobar que persiste | HTTP 200 y datos nuevos al releer | HTTP 200, supervisores 6 | Aprobado |
| E-03 | Editar registro id 3 y comprobar que persiste | HTTP 200 y datos nuevos al releer | HTTP 200, supervisores 7 | Aprobado |
| E-04 | Editar registro inexistente | HTTP 404 | HTTP 404 | Aprobado |
| D-01 | Eliminar registro id 15 | HTTP 200 y luego 404 al consultarlo | HTTP 200 / luego 404 | Aprobado |
| D-02 | Eliminar registro id 14 | HTTP 200 y luego 404 al consultarlo | HTTP 200 / luego 404 | Aprobado |
| X-01 | Exportar Excel | HTTP 200 y 13 registros vigentes | HTTP 200, X-Total-Registros=13 | Aprobado |
| X-02 | El Excel conserva macros e imágenes | vbaProject.bin e imágenes presentes | vbaProject.bin: true | Aprobado |
| X-03 | El Excel conserva todas las partes de la plantilla (hojas, tablas, validaciones) | 59 partes | 59 partes | Aprobado |
| X-04 | Hojas auxiliares idénticas a la plantilla (byte a byte) | sheet2 a sheet9 sin cambios | Idénticas | Aprobado |
| S-01 | Los datos se guardan en un archivo de base de datos | Archivo .db creado con los registros | prueba_1793060389474.db: 28672 bytes | Aprobado |
| S-02 | Persistencia: un proceso nuevo lee los mismos registros | 13 registros | 13 registros | Aprobado |