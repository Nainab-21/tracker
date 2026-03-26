# StomaSense – Roadmap 2026 🌿

## Archivos generados

| Archivo | Descripción |
|---|---|
| `planificacion_stomasense.xlsx` | Excel editable con las 46 tareas planificadas |
| `gantt_stomasense.html` | Gantt interactivo (autogenerado) |
| `crear_planificacion.py` | Script que crea/reinicia el Excel base |
| `generar_gantt.py` | Script que lee el Excel y genera el HTML |

---

## Flujo de trabajo

1. **Editar el Excel** `planificacion_stomasense.xlsx`
   - Actualiza `% Avance` (columna K) con 0–100
   - Cambia el `Estado` (columna L) con el menú desplegable
   - Ajusta fechas de `Inicio` / `Fin` si cambian los plazos
   - Añade notas en la columna M

2. **Regenerar el Gantt** — en terminal:
   ```
   python generar_gantt.py
   ```
   Esto sobreescribe `gantt_stomasense.html` con los datos actualizados.

3. **Abrir** `gantt_stomasense.html` en el navegador.

---

## Funcionalidades del Gantt

- **Expandir / Colapsar** por Bloque y por Proyecto (click en la fila de grupo)
- **Filtros** por Bloque, Categoría, Estado y búsqueda libre
- **Zoom** Semana / Mes / Todo el proyecto
- **Línea roja** de hoy siempre visible
- **Tooltips** con todos los detalles al pasar el cursor sobre la barra
- **Panel lateral** con KPIs en tiempo real y progreso por proyecto

---

## Bloques de prioridades cubiertos

### Prioridades [3 Meses – Mar/Abr/May 2026]
| Proyecto | Tareas |
|---|---|
| Teledetección – Feedback PSH | 5 |
| App Móvil Teledetección [E2E] | 6 |
| Movilidad Empresarial [Modelos\|Lab\|Op] | 5 |

### Prioridades [May – Oct 2026]
| Proyecto | Tareas |
|---|---|
| Modelos IA – Pol\|Maduración\|TCH\|Caña | 7 |
| Frescura de Caña | 5 |
| Salud Financiera \| Rentabilidad Fincas | 4 |
| IoT Analytics – Telemetría [Riesgos] | 5 |
| IoT – Movilidad Empresarial [Avance Labores] | 4 |
| Módulo Operacional – Módulo de Riego | 5 |

**Total: 46 tareas en 9 proyectos**

---

## Estados disponibles

| Estado | Color |
|---|---|
| Pendiente | Gris |
| En Progreso | Azul |
| Completado | Verde |
| Bloqueado | Rojo |
| En Revisión | Amarillo |
