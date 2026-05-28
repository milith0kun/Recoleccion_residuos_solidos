# Documentacion de referencia municipal para el User Story Mapping

## Municipio tomado como referencia

Para corregir el User Story Mapping se tomo como referencia funcional a la **Municipalidad Distrital de Santiago - Cusco**.

El nombre del municipio no debe mostrarse en la pagina del mapping ni en la interfaz final. Se usa solo como base de analisis para adaptar el sistema a un servicio distrital urbano real de Cusco.

## Fuentes verificables consultadas

1. **Plataforma oficial gob.pe - Municipalidad Distrital de Santiago - Cusco**
   - URL: https://www.gob.pe/munisantiago-cusco
   - Uso en el proyecto: confirma la entidad municipal, su ubicacion institucional, canales de atencion, documentacion institucional, tramites y estructura de contacto.

2. **Ordenanza Municipal N. 021-2025-A-MDS-C**
   - URL: https://www.gob.pe/institucion/munisantiago-cusco/normas-legales/7431735-021-2025-a-mds-c
   - Dato relevante: aprueba la ordenanza que regula la gestion integral y manejo de residuos solidos en el distrito de Santiago.
   - Uso en el proyecto: sustenta que el sistema debe modelarse como gestion integral distrital de residuos solidos, no como una aplicacion generica sin marco municipal.

3. **Programa Municipal de Educacion, Cultura y Ciudadania Ambiental - SINIA/MINAM**
   - URL: https://sinia.minam.gob.pe/normas/programa-municipal-educacion-cultura-ciudadania-ambiental-1232
   - Dato relevante: el programa busca promover cultura y educacion ambiental e incentivar participacion ciudadana.
   - Uso en el proyecto: sustenta las HU relacionadas con guia de residuos, segregacion, sensibilizacion y participacion vecinal.

4. **Jornada de limpieza y recojo de residuos solidos en sector Qolqas - gob.pe**
   - URL: https://www.gob.pe/institucion/culturacusco/noticias/1246372-se-cumplio-jornada-de-limpieza-y-recojo-de-residuos-solidos-en-el-sector-qolqas-de-la-zona-arqueologica-de-muyuorq-o
   - Datos relevantes:
     - La actividad se realizo en el distrito de Santiago.
     - Participaron APV como Senor de Huanca, Mirador Cusqueno, Cesar Vallejo, Alto Wimpillay, Hijos de Caleb, Viva el Peru, Intipampa y Jardines de Santa Teresa.
     - Se recolectaron aproximadamente 8 m3 de residuos, retirados con un volquete de la Municipalidad Distrital de Santiago.
   - Uso en el proyecto: sustenta el uso de sectores, barrios/APV, cuadrillas o personal de campo, puntos criticos y participacion vecinal.

5. **Contraloria - supervision de residuos solidos en municipalidades de Cusco**
   - URL: https://www.gob.pe/institucion/contraloria/noticias/594354-contraloria-supervisa-manejo-y-gestion-de-residuos-solidos-en-44-municipalidades-de-cusco
   - Datos relevantes:
     - El servicio de limpieza publica debe verificar recoleccion, transporte y disposicion final.
     - Cusco, Santiago, San Sebastian y Wanchaq son mencionados entre los distritos que mas residuos generan en la ciudad imperial.
   - Uso en el proyecto: sustenta que el sistema debe cubrir control operativo, cumplimiento de rutas, recoleccion, transporte, alertas e indicadores.

## Hechos funcionales considerados

- El sistema debe modelarse para **un solo distrito urbano**, no para varios municipios.
- Las "zonas" deben entenderse como **sectores operativos**, barrios, APV o puntos criticos dentro del distrito.
- La gestion municipal no solo requiere mostrar rutas: tambien necesita planificar turnos, vehiculos, cuadrillas y cobertura.
- La participacion ciudadana es relevante porque hay programas de educacion ambiental y actividades con vecinos/APV.
- La segregacion y valorizacion son importantes, pero no necesariamente parte del primer MVP operativo.
- El reporte de incidencias debe cubrir casos como acumulacion, residuos fuera de horario, puntos no atendidos y recoleccion no realizada.
- El seguimiento GPS tiene sentido para controlar avance real de rutas y comunicar estado del servicio.
- La analitica municipal debe aparecer al final del flujo porque depende de datos historicos de ejecucion, incidencias y participacion.

## Actores definidos para el mapping

### Ciudadano

Vecino del distrito que necesita:

- registrarse;
- quedar asociado a su sector;
- consultar calendario y rutas;
- recibir alertas;
- reportar incidencias;
- consultar orientacion de segregacion.

### Administrador

Responsable municipal de configuracion y gestion institucional:

- sectores operativos;
- catalogo de residuos;
- seguimiento de indicadores;
- participacion vecinal;
- acciones de sensibilizacion.

### Planificador

Rol operativo municipal encargado de:

- programar rutas;
- asignar turnos;
- coordinar vehiculos;
- organizar cuadrillas;
- medir cumplimiento.

### Cuadrilla

Personal de campo/conductor encargado de:

- ejecutar ruta;
- activar seguimiento GPS;
- reportar retrasos, averias o puntos no atendidos.

### Todos

Actor transversal cuando una funcion sirve a mas de un rol, por ejemplo visualizar rutas o acceder al sistema segun permisos.

## Criterio de orden del User Story Mapping

El orden debe representar el flujo completo del servicio:

1. Ingreso al sistema.
2. Configuracion distrital basica.
3. Planificacion de rutas.
4. Consulta ciudadana.
5. Ejecucion en campo.
6. Alertas.
7. Incidencias.
8. Educacion/segregacion.
9. Analitica municipal.

Por eso el orden actual del mapping es:

1. RF-01 - Registro de ciudadanos.
2. RF-02 - Autenticacion e inicio de sesion.
3. RF-03 - Gestion de sectores/zona de recoleccion.
4. RF-04 - Asignacion de ciudadano a sector.
5. RF-09 - Planificacion de rutas.
6. RF-10 - Consulta de calendario/horarios.
7. RF-07 - Visualizacion de rutas.
8. RF-08 - Seguimiento GPS.
9. RF-12 - Notificacion de cercania.
10. RF-13 - Alertas por retraso o incidencia en ruta.
11. RF-11 - Reporte ciudadano de incidencias.
12. RF-06 - Clasificacion de residuos.
13. RF-05 - Mantenimiento del catalogo de residuos.
14. RF-14 - Reporte de residuos recolectados/valorizados.
15. RF-15 - Reporte de cumplimiento de rutas.
16. RF-16 - Reporte de participacion ciudadana.

## Criterio de MVP

El MVP debe priorizar que el corazon del sistema se pueda demostrar de extremo a extremo: configuracion territorial, planificacion, consulta ciudadana, ejecucion en campo, seguimiento, alertas e incidencias. No se limita solo al acceso o a la carga de datos.

HU consideradas MVP:

- RF-01 Registro.
- RF-02 Inicio de sesion.
- RF-03 Sectores operativos.
- RF-04 Asignacion del vecino a sector.
- RF-09 Planificacion de rutas.
- RF-10 Calendario/horarios.
- RF-07 Visualizacion de rutas.
- RF-08 GPS de cuadrilla.
- RF-12 Notificacion de cercania.
- RF-13 Alertas por retraso o incidencia.
- RF-11 Reporte de incidencias.

HU no consideradas MVP inicial:

- RF-05 Catalogo de residuos.
- RF-06 Guia de segregacion.
- RF-14 Reportes de residuos.
- RF-15 Cumplimiento de rutas.
- RF-16 Participacion ciudadana.

Estas funciones son importantes, pero pueden implementarse despues de validar el flujo operativo base.

## Decisiones aplicadas al mapping

- Se evita poner el nombre del municipio en la pagina del mapping.
- Se reemplaza "zona" por una idea mas precisa: sector operativo, barrio, APV o punto critico.
- Se separa el rol de planificacion municipal del rol de administracion general.
- Se reemplaza "conductor" por "cuadrilla" para representar mejor al personal de campo.
- Se ubica el catalogo de residuos despues del flujo operativo principal, porque no es indispensable para iniciar la recoleccion.
- Se ubica la analitica al final, porque depende de datos acumulados.
- Se evita convertir criterios de aceptacion en HU separadas.

## Pendientes recomendados

- Definir sectores operativos reales o simulados del distrito elegido.
- Decidir si el sistema usara barrios, APV, zonas catastrales o poligonos propios del servicio.
- Confirmar si la recoleccion selectiva se modelara como ruta separada o como tipo de servicio dentro de una ruta.
- Definir estados operativos de ruta: programada, en curso, retrasada, completada, cancelada.
- Definir estados de incidencia: reportada, en revision, atendida, cerrada.
- Definir que reportes se dejan para version posterior.
