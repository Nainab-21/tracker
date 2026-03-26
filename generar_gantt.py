"""
generar_gantt.py
Lee planificacion_stomasense.xlsx y genera un diagrama de Gantt
interactivo como HTML auto-contenido con:
  - Agrupación por Bloque y Proyecto (expandir/colapsar)
  - Barra de progreso coloreada por estado
  - Filtros por bloque, categoría y estado
  - Panel lateral de métricas en tiempo real
  - Línea de hoy (fecha actual)
  - Tooltips con detalles completos
"""

import pandas as pd
import plotly.graph_objects as go
import json
import os
import sys
from datetime import datetime, date

# ─────────────────────────────────────────────
# CONFIGURACIÓN
# ─────────────────────────────────────────────
EXCEL_FILE = "planificacion_stomasense.xlsx"
OUTPUT_HTML = "gantt_stomasense.html"

STATUS_COLORS = {
    "Pendiente":    "#A6A6A6",
    "En Progreso":  "#5B9BD5",
    "Completado":   "#70AD47",
    "Bloqueado":    "#C00000",
    "En Revisión":  "#FFD966",
}
STATUS_TEXT = {
    "Pendiente":    "#000000",
    "En Progreso":  "#FFFFFF",
    "Completado":   "#FFFFFF",
    "Bloqueado":    "#FFFFFF",
    "En Revisión":  "#000000",
}
BLOQUE_COLORS = {
    "3 Meses (Mar-May 2026)": "#FFC000",
    "May-Oct 2026":           "#5B9BD5",
}
PROJECT_PALETTE = [
    "#264478", "#2E75B6", "#AE5A00", "#538135",
    "#7030A0", "#C55A11", "#17375E", "#833C00",
    "#1F4E79", "#375623",
]


# ─────────────────────────────────────────────
# LECTURA DE DATOS
# ─────────────────────────────────────────────
def cargar_datos():
    if not os.path.exists(EXCEL_FILE):
        print(f"❌ No se encontró '{EXCEL_FILE}'. Ejecuta primero crear_planificacion.py")
        sys.exit(1)

    df = pd.read_excel(EXCEL_FILE, sheet_name="Planificación", header=2)
    df.columns = [
        "ID", "Bloque", "Proyecto", "Categoria", "Tarea", "Descripcion",
        "Responsable", "Inicio", "Fin", "Dias", "Pct", "Estado", "Notas", "Actualizado"
    ]
    df = df.dropna(subset=["Tarea"])
    df["Inicio"] = pd.to_datetime(df["Inicio"])
    df["Fin"]    = pd.to_datetime(df["Fin"])
    df["Pct"]    = pd.to_numeric(df["Pct"], errors="coerce").fillna(0).astype(int)
    df["Estado"] = df["Estado"].fillna("Pendiente").astype(str)
    df["Bloque"] = df["Bloque"].fillna("Sin bloque").astype(str)
    df["Proyecto"] = df["Proyecto"].fillna("Sin proyecto").astype(str)
    df["Responsable"] = df["Responsable"].fillna("—").astype(str)
    df["Notas"] = df["Notas"].fillna("").astype(str)
    return df


# ─────────────────────────────────────────────
# CONSTRUCCIÓN DEL HTML INTERACTIVO
# ─────────────────────────────────────────────
def generar_html(df):
    today = datetime.today()
    today_str = today.strftime("%Y-%m-%d")
    today_label = today.strftime("%d/%m/%Y")

    # ── Ordenar y asignar color por proyecto ──
    proyectos = df["Proyecto"].unique().tolist()
    proy_color = {p: PROJECT_PALETTE[i % len(PROJECT_PALETTE)] for i, p in enumerate(proyectos)}

    # ── Construir datos por fila ──
    tasks = []
    for _, row in df.iterrows():
        dur_done = int((row["Fin"] - row["Inicio"]).days * row["Pct"] / 100)
        tasks.append({
            "id":           int(row["ID"]) if not pd.isna(row["ID"]) else 0,
            "bloque":       row["Bloque"],
            "proyecto":     row["Proyecto"],
            "categoria":    row["Categoria"] if not pd.isna(row["Categoria"]) else "",
            "tarea":        row["Tarea"],
            "desc":         row["Descripcion"] if not pd.isna(row["Descripcion"]) else "",
            "responsable":  row["Responsable"],
            "inicio":       row["Inicio"].strftime("%Y-%m-%d"),
            "fin":          row["Fin"].strftime("%Y-%m-%d"),
            "dias":         int(row["Dias"]) if not pd.isna(row["Dias"]) else 0,
            "pct":          int(row["Pct"]),
            "estado":       row["Estado"],
            "notas":        row["Notas"],
            "color":        STATUS_COLORS.get(row["Estado"], "#A6A6A6"),
            "proy_color":   proy_color.get(row["Proyecto"], "#264478"),
            "dur_done":     dur_done,
        })

    # ── Estadísticas ──
    total      = len(tasks)
    completado = sum(1 for t in tasks if t["estado"] == "Completado")
    en_progreso= sum(1 for t in tasks if t["estado"] == "En Progreso")
    bloqueado  = sum(1 for t in tasks if t["estado"] == "Bloqueado")
    pendiente  = sum(1 for t in tasks if t["estado"] == "Pendiente")
    pct_global = round(sum(t["pct"] for t in tasks) / total, 1) if total > 0 else 0

    # ── Top proyectos (por avance) ──
    proy_stats = {}
    for t in tasks:
        p = t["proyecto"]
        if p not in proy_stats:
            proy_stats[p] = {"total": 0, "sum_pct": 0, "bloque": t["bloque"]}
        proy_stats[p]["total"]   += 1
        proy_stats[p]["sum_pct"] += t["pct"]
    for p in proy_stats:
        proy_stats[p]["avg_pct"] = round(proy_stats[p]["sum_pct"] / proy_stats[p]["total"], 1)

    tasks_json   = json.dumps(tasks, ensure_ascii=False)
    proy_json    = json.dumps(proy_stats, ensure_ascii=False)
    bloque_list  = json.dumps(list(dict.fromkeys(t["bloque"] for t in tasks)), ensure_ascii=False)
    cat_list     = json.dumps(list(dict.fromkeys(t["categoria"] for t in tasks)), ensure_ascii=False)
    status_list  = json.dumps(list(STATUS_COLORS.keys()), ensure_ascii=False)
    colors_json  = json.dumps(STATUS_COLORS, ensure_ascii=False)

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StomaSense – Gantt Roadmap 2026</title>
<style>
  /* ── Reset & base ── */
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; background: #F0F4F8; color: #1a1a2e; }}

  /* ── Header ── */
  .header {{
    background: linear-gradient(135deg, #1F3864 0%, #2E75B6 100%);
    color: #fff; padding: 18px 28px; display: flex;
    align-items: center; justify-content: space-between;
    box-shadow: 0 3px 10px rgba(0,0,0,0.25);
    position: sticky; top: 0; z-index: 100;
  }}
  .header h1 {{ font-size: 1.4rem; font-weight: 700; letter-spacing: 0.5px; }}
  .header .meta {{ font-size: 0.78rem; opacity: 0.8; margin-top: 4px; }}
  .today-badge {{
    background: #FFD966; color: #1a1a2e; border-radius: 20px;
    padding: 5px 14px; font-size: 0.8rem; font-weight: 600;
  }}

  /* ── Layout ── */
  .layout {{ display: flex; height: calc(100vh - 68px); overflow: hidden; }}
  .sidebar {{
    width: 280px; min-width: 230px; background: #fff;
    border-right: 1px solid #dde3ed;
    overflow-y: auto; padding: 16px; flex-shrink: 0;
  }}
  .main {{ flex: 1; overflow: auto; padding: 16px; }}

  /* ── Sidebar sections ── */
  .sidebar h3 {{
    font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1px;
    color: #5c7da8; margin: 14px 0 8px; padding-bottom: 4px;
    border-bottom: 1px solid #eef2f8;
  }}

  /* ── KPI cards ── */
  .kpi-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }}
  .kpi {{
    background: #F0F4F8; border-radius: 8px; padding: 10px 8px;
    text-align: center; border: 1px solid #dde3ed;
  }}
  .kpi .val {{ font-size: 1.5rem; font-weight: 700; }}
  .kpi .lbl {{ font-size: 0.68rem; color: #666; margin-top: 2px; }}
  .kpi.green  .val {{ color: #538135; }}
  .kpi.blue   .val {{ color: #2E75B6; }}
  .kpi.red    .val {{ color: #C00000; }}
  .kpi.orange .val {{ color: #ED7D31; }}
  .kpi.purple .val {{ color: #7030A0; }}

  /* ── Progress bar global ── */
  .global-progress {{ margin: 12px 0; }}
  .global-progress .lbl {{
    display: flex; justify-content: space-between;
    font-size: 0.75rem; color: #555; margin-bottom: 4px;
  }}
  .progress-outer {{
    background: #e0e7ef; border-radius: 20px; height: 10px; overflow: hidden;
  }}
  .progress-inner {{
    height: 100%; border-radius: 20px;
    background: linear-gradient(90deg, #2E75B6, #70AD47);
    transition: width 0.5s;
  }}

  /* ── Filters ── */
  .filter-row {{ margin-bottom: 8px; }}
  .filter-row label {{ font-size: 0.72rem; color: #555; display: block; margin-bottom: 3px; }}
  .filter-row select, .filter-row input {{
    width: 100%; padding: 5px 8px; border: 1px solid #cdd4df;
    border-radius: 6px; font-size: 0.8rem; background: #f8fafc;
    color: #1a1a2e;
  }}
  .btn-refresh {{
    width: 100%; margin-top: 10px; padding: 8px; background: #2E75B6;
    color: #fff; border: none; border-radius: 6px; font-size: 0.82rem;
    cursor: pointer; font-weight: 600; transition: background 0.2s;
  }}
  .btn-refresh:hover {{ background: #1F5FA6; }}

  /* ── Project cards in sidebar ── */
  .proy-card {{
    border-radius: 6px; padding: 8px 10px; margin-bottom: 6px;
    border-left: 4px solid;  background: #f8fafc;
    cursor: pointer; transition: transform 0.15s;
  }}
  .proy-card:hover {{ transform: translateX(2px); }}
  .proy-card .name {{ font-size: 0.75rem; font-weight: 600; }}
  .proy-card .prog {{ font-size: 0.68rem; color: #666; margin-top: 4px; }}
  .proy-card .bar-outer {{ background: #e0e7ef; border-radius: 10px; height: 5px; margin-top: 4px; }}
  .proy-card .bar-inner {{ height: 5px; border-radius: 10px; }}

  /* ── Gantt container ── */
  .gantt-wrapper {{ background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; }}
  .gantt-controls {{
    display: flex; align-items: center; gap: 10px; padding: 12px 16px;
    border-bottom: 1px solid #eef2f8; background: #f8fafc;
  }}
  .btn-expand, .btn-collapse {{
    padding: 5px 14px; border-radius: 5px; font-size: 0.78rem; cursor: pointer;
    border: 1px solid #cdd4df; background: #fff; color: #1a1a2e; font-weight: 600;
    transition: background 0.15s;
  }}
  .btn-expand:hover  {{ background: #e0e7ef; }}
  .btn-collapse:hover {{ background: #e0e7ef; }}
  .zoom-group {{ display: flex; gap: 5px; margin-left: auto; }}
  .btn-zoom {{
    padding: 4px 11px; border-radius: 5px; font-size: 0.78rem; cursor: pointer;
    border: 1px solid #cdd4df; background: #fff; transition: background 0.15s;
  }}
  .btn-zoom:hover {{ background: #e0e7ef; }}
  .btn-zoom.active {{ background: #2E75B6; color: #fff; border-color: #2E75B6; }}

  /* ── Gantt table ── */
  #gantt-table {{ width: 100%; border-collapse: collapse; font-size: 0.78rem; }}
  #gantt-table thead th {{
    background: #1F3864; color: #fff; padding: 8px 10px;
    text-align: left; white-space: nowrap; position: sticky; top: 0; z-index: 10;
  }}
  #gantt-table thead th.date-col {{
    text-align: center; font-size: 0.68rem; min-width: 30px; padding: 4px 2px;
  }}
  .group-row {{
    background: #1F3864; color: #fff; cursor: pointer;
    font-weight: 700; font-size: 0.82rem;
  }}
  .group-row td {{ padding: 8px 12px; }}
  .group-row:hover {{ background: #2E75B6; }}
  .subgroup-row {{
    cursor: pointer; font-weight: 600; font-size: 0.78rem;
  }}
  .subgroup-row td {{ padding: 7px 10px 7px 20px; }}
  .task-row {{ transition: background 0.1s; }}
  .task-row:hover {{ background: #f0f4f8 !important; }}
  .task-row td {{ padding: 6px 10px 6px 28px; border-bottom: 1px solid #eef2f8; }}
  .task-name {{ font-weight: 500; }}
  .task-meta {{ color: #888; font-size: 0.7rem; margin-top: 1px; }}
  .status-badge {{
    display: inline-block; padding: 2px 8px; border-radius: 10px;
    font-size: 0.68rem; font-weight: 700; white-space: nowrap;
  }}
  .pct-text {{ font-size: 0.7rem; color: #555; white-space: nowrap; }}

  /* ── Gantt bars area ── */
  .bar-cell {{ position: relative; padding: 0 !important; height: 38px; }}
  .gantt-bar-bg {{ position: absolute; inset: 7px 0; border-radius: 3px; opacity: 0.18; }}
  .gantt-bar {{
    position: absolute; top: 9px; border-radius: 3px; height: 20px;
    display: flex; align-items: center; overflow: hidden; white-space: nowrap;
  }}
  .gantt-bar .bar-label {{ color: #fff; font-size: 0.62rem; font-weight: 600; padding-left: 5px; overflow: hidden; text-overflow: ellipsis; }}
  .gantt-bar-done {{
    position: absolute; top: 9px; border-radius: 3px 0 0 3px; height: 20px;
    opacity: 0.6; pointer-events: none;
  }}

  /* ── Today line ── */
  .today-line {{
    position: absolute; top: 0; width: 2px; background: #C00000;
    z-index: 20; pointer-events: none;
  }}
  .today-line::after {{
    content: 'Hoy'; position: absolute; top: 0; left: 4px;
    font-size: 0.6rem; color: #C00000; font-weight: 700; white-space: nowrap;
  }}

  /* ── Tooltip ── */
  .tooltip {{
    position: fixed; display: none; z-index: 9999;
    background: #1a1a2e; color: #fff; border-radius: 8px;
    padding: 10px 14px; font-size: 0.75rem; max-width: 320px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.3); pointer-events: auto;
    line-height: 1.5;
  }}
  .tooltip .tt-title {{ font-size: 0.85rem; font-weight: 700; margin-bottom: 6px; color: #FFD966; }}
  .tooltip .tt-row {{ display: flex; gap: 6px; }}
  .tooltip .tt-key {{ color: #aaa; min-width: 90px; flex-shrink: 0; }}
  .tooltip .tt-sep {{ border-top: 1px solid rgba(255,255,255,0.15); margin: 5px 0; }}

  /* ── Responsive ── */
  @media (max-width: 900px) {{
    .sidebar {{ display: none; }}
  }}
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div>
    <h1>🌿 StomaSense – Roadmap de Prioridades 2026</h1>
    <div class="meta">Bloques: [3 Meses Mar-May 2026] · [May-Oct 2026] · Actualizado: {today_label}</div>
  </div>
  <div class="today-badge">📅 Hoy: {today_label}</div>
</div>

<!-- LAYOUT -->
<div class="layout">
  <!-- SIDEBAR -->
  <div class="sidebar">
    <h3>📊 Resumen Global</h3>
    <div class="global-progress">
      <div class="lbl"><span>Avance global</span><span id="pct-global">{pct_global}%</span></div>
      <div class="progress-outer"><div class="progress-inner" style="width:{pct_global}%"></div></div>
    </div>
    <div class="kpi-grid">
      <div class="kpi blue"><div class="val" id="kpi-total">{total}</div><div class="lbl">Total tareas</div></div>
      <div class="kpi green"><div class="val" id="kpi-done">{completado}</div><div class="lbl">Completadas</div></div>
      <div class="kpi orange"><div class="val" id="kpi-prog">{en_progreso}</div><div class="lbl">En Progreso</div></div>
      <div class="kpi red"><div class="val" id="kpi-block">{bloqueado}</div><div class="lbl">Bloqueadas</div></div>
    </div>

    <h3>🔍 Filtros</h3>
    <div class="filter-row">
      <label>Bloque</label>
      <select id="filter-bloque" onchange="applyFilters()">
        <option value="">Todos</option>
      </select>
    </div>
    <div class="filter-row">
      <label>Categoría</label>
      <select id="filter-cat" onchange="applyFilters()">
        <option value="">Todas</option>
      </select>
    </div>
    <div class="filter-row">
      <label>Estado</label>
      <select id="filter-estado" onchange="applyFilters()">
        <option value="">Todos</option>
      </select>
    </div>
    <div class="filter-row">
      <label>Buscar tarea</label>
      <input type="text" id="filter-search" placeholder="Escribir..." oninput="applyFilters()">
    </div>
    <button class="btn-refresh" onclick="resetFilters()">↺ Limpiar filtros</button>

    <h3>📁 Proyectos</h3>
    <div id="proy-cards"></div>
  </div>

  <!-- MAIN -->
  <div class="main">
    <div class="gantt-wrapper">
      <div class="gantt-controls">
        <button class="btn-expand"   onclick="expandAll()">▼ Expandir todo</button>
        <button class="btn-collapse" onclick="collapseAll()">▲ Colapsar todo</button>
        <span style="color:#888;font-size:0.75rem">Click en grupo/proyecto para expandir/colapsar</span>
        <div class="zoom-group">
          <button class="btn-zoom" onclick="setZoom('week')"  id="zoom-week">Por Día</button>
          <button class="btn-zoom active" onclick="setZoom('month')" id="zoom-month">Por Mes</button>
          <button class="btn-zoom" onclick="setZoom('all')"   id="zoom-all">Compacto</button>
        </div>
      </div>
      <div id="gantt-scroll" style="overflow-x:auto; position:relative;">
        <table id="gantt-table">
          <thead id="gantt-thead"></thead>
          <tbody id="gantt-tbody"></tbody>
        </table>
        <div class="today-line" id="today-line" style="height:0;display:none;"></div>
      </div>
    </div>
  </div>
</div>

<!-- TOOLTIP -->
<div class="tooltip" id="tooltip"></div>

<script>
// ─── DATA ───────────────────────────────────────────
const TASKS_ALL   = {tasks_json};
const PROY_STATS  = {proy_json};
const BLOQUES     = {bloque_list};
const CATS        = {cat_list};
const STATUSES    = {status_list};
const STATUS_COLORS = {colors_json};
const TODAY_STR   = "{today_str}";

// ─── STATE ──────────────────────────────────────────
let collapsed = {{}};   // key = "bloque::proyecto" or "bloque"
let currentZoom = "month";
let filteredTasks = [...TASKS_ALL];

// ─── UTILS ──────────────────────────────────────────
function parseDate(s) {{ return new Date(s + "T00:00:00"); }}
function fmtDate(s) {{
  const d = parseDate(s);
  return d.toLocaleDateString("es-CO", {{day:"2-digit", month:"short", year:"2-digit"}});
}}
function daysBetween(a, b) {{
  return Math.ceil((parseDate(b) - parseDate(a)) / 86400000);
}}
function hexToRgba(hex, alpha) {{
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${{r}},${{g}},${{b}},${{alpha}})`;
}}
function clamp(val, mn, mx) {{ return Math.max(mn, Math.min(mx, val)); }}

// ─── ZOOM RANGES ────────────────────────────────────
function getZoomRange() {{
  // Always show the full task range — zoom only controls granularity (day vs month columns)
  const starts = filteredTasks.map(t => parseDate(t.inicio));
  const ends   = filteredTasks.map(t => parseDate(t.fin));
  if (!starts.length) {{ const d = new Date(); return [d, d]; }}
  const minD = new Date(Math.min(...starts)); minD.setDate(minD.getDate() - 3);
  const maxD = new Date(Math.max(...ends));   maxD.setDate(maxD.getDate() + 3);
  return [minD, maxD];
}}

// ─── FILTER INIT ────────────────────────────────────
function initFilters() {{
  const fb = document.getElementById("filter-bloque");
  BLOQUES.forEach(b => {{ const o = document.createElement("option"); o.value = b; o.textContent = b; fb.appendChild(o); }});
  const fc = document.getElementById("filter-cat");
  CATS.filter(Boolean).forEach(c => {{ const o = document.createElement("option"); o.value = c; o.textContent = c; fc.appendChild(o); }});
  const fs = document.getElementById("filter-estado");
  STATUSES.forEach(s => {{ const o = document.createElement("option"); o.value = s; o.textContent = s; fs.appendChild(o); }});
}}
function applyFilters() {{
  const bloque = document.getElementById("filter-bloque").value;
  const cat    = document.getElementById("filter-cat").value;
  const estado = document.getElementById("filter-estado").value;
  const search = document.getElementById("filter-search").value.toLowerCase();
  filteredTasks = TASKS_ALL.filter(t =>
    (!bloque || t.bloque === bloque) &&
    (!cat    || t.categoria === cat) &&
    (!estado || t.estado === estado) &&
    (!search || t.tarea.toLowerCase().includes(search) || t.proyecto.toLowerCase().includes(search))
  );
  renderAll();
}}
function resetFilters() {{
  document.getElementById("filter-bloque").value  = "";
  document.getElementById("filter-cat").value     = "";
  document.getElementById("filter-estado").value  = "";
  document.getElementById("filter-search").value  = "";
  filteredTasks = [...TASKS_ALL];
  renderAll();
}}

// ─── SIDEBAR PROJECT CARDS ──────────────────────────
function renderProyCards() {{
  const container = document.getElementById("proy-cards");
  container.innerHTML = "";
  for (const [proy, stat] of Object.entries(PROY_STATS)) {{
    const col = stat.bloque === "3 Meses (Mar-May 2026)" ? "#FFC000" : "#5B9BD5";
    const div = document.createElement("div");
    div.className = "proy-card";
    div.style.borderLeftColor = col;
    div.innerHTML = `
      <div class="name">${{proy}}</div>
      <div class="prog">${{stat.total}} tareas · ${{stat.avg_pct}}% avance</div>
      <div class="bar-outer"><div class="bar-inner" style="width:${{stat.avg_pct}}%;background:${{col}}"></div></div>`;
    div.onclick = () => {{
      document.getElementById("filter-bloque").value = stat.bloque;
      document.getElementById("filter-cat").value = "";
      document.getElementById("filter-search").value = proy;
      applyFilters();
    }};
    container.appendChild(div);
  }}
}}

// ─── BUILD GANTT HEADER (date columns) ──────────────
function buildDateCols(rangeStart, rangeEnd) {{
  const cols = [];
  if (currentZoom === "week") {{
    let d = new Date(rangeStart);
    while (d <= rangeEnd) {{
      const dow = d.getDay();
      cols.push({{
        label:      String(d.getDate()),
        monthLabel: d.toLocaleDateString("es-CO", {{month:"short", year:"2-digit"}}),
        monthKey:   `${{d.getFullYear()}}-${{d.getMonth()}}`,
        date:       new Date(d),
        isWeekend:  dow === 0 || dow === 6,
        days:       1
      }});
      d.setDate(d.getDate() + 1);
    }}
  }} else {{
    let d = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (d <= rangeEnd) {{
      cols.push({{
        label: d.toLocaleDateString("es-CO", {{month:"short", year:"2-digit"}}),
        date: new Date(d), days: new Date(d.getFullYear(), d.getMonth()+1, 0).getDate()
      }});
      d.setMonth(d.getMonth() + 1);
    }}
  }}
  return cols;
}}

// ─── RENDER GANTT ────────────────────────────────────
function renderAll() {{
  const [rangeStart, rangeEnd] = getZoomRange();
  const totalDays = daysBetween(rangeStart.toISOString().slice(0,10), rangeEnd.toISOString().slice(0,10));
  const BAR_WIDTH = currentZoom === "week" ? 26 : currentZoom === "month" ? 8 : 5;
  const dateCols = buildDateCols(rangeStart, rangeEnd);
  const totalBarPx = dateCols.reduce((s, c) => s + (c.days || 1) * BAR_WIDTH, 0);

  // ── HEADER ──
  const thead = document.getElementById("gantt-thead");
  thead.innerHTML = "";
  const hrow = document.createElement("tr");
  const fixedCols = [
    ["#", "40px"], ["Tarea / Proyecto", "260px"],
    ["Responsable", "110px"], ["Fechas", "130px"],
    ["Est.", "95px"], ["Avance", "80px"]
  ];
  fixedCols.forEach(([lbl, w]) => {{
    const th = document.createElement("th");
    th.textContent = lbl; th.style.minWidth = w; th.style.width = w;
    hrow.appendChild(th);
  }});
  // Date header
  const barTh = document.createElement("th");
  barTh.style.padding = "0"; barTh.style.minWidth = totalBarPx + "px";

  if (currentZoom === "week") {{
    // Row 1: month group labels
    const monthRow = document.createElement("div");
    monthRow.style.cssText = `display:flex;align-items:center;height:18px;border-bottom:1px solid rgba(255,255,255,0.25);`;
    let mGroups = [], cur = null;
    dateCols.forEach(col => {{
      if (!cur || cur.key !== col.monthKey) {{
        cur = {{key: col.monthKey, label: col.monthLabel, count: 1}};
        mGroups.push(cur);
      }} else {{ cur.count++; }}
    }});
    mGroups.forEach(g => {{
      const s = document.createElement("span");
      const w = g.count * BAR_WIDTH;
      s.style.cssText = `flex:0 0 ${{w}}px;width:${{w}}px;text-align:center;font-size:0.65rem;font-weight:700;border-right:1px solid rgba(255,255,255,0.3);overflow:hidden;white-space:nowrap;padding:0 4px;letter-spacing:0.3px;`;
      s.textContent = g.label;
      monthRow.appendChild(s);
    }});
    barTh.appendChild(monthRow);

    // Row 2: individual day numbers
    const dayRow = document.createElement("div");
    dayRow.style.cssText = `display:flex;align-items:center;height:18px;`;
    dateCols.forEach(col => {{
      const s = document.createElement("span");
      s.style.cssText = `flex:0 0 ${{BAR_WIDTH}}px;width:${{BAR_WIDTH}}px;text-align:center;font-size:0.63rem;border-right:1px solid rgba(255,255,255,0.12);white-space:nowrap;${{col.isWeekend ? "opacity:0.45;" : ""}}`;
      s.textContent = col.label;
      dayRow.appendChild(s);
    }});
    barTh.appendChild(dayRow);

  }} else {{
    // Month / All: single row with month label spanning full month width
    const dateRow = document.createElement("div");
    dateRow.style.cssText = `display:flex;align-items:center;height:36px;padding:0;`;
    dateCols.forEach(col => {{
      const span = document.createElement("span");
      const w = (col.days || 1) * BAR_WIDTH;
      span.style.cssText = `flex:0 0 ${{w}}px;width:${{w}}px;text-align:center;font-size:0.65rem;border-right:1px solid rgba(255,255,255,0.2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 2px;`;
      span.textContent = col.label;
      dateRow.appendChild(span);
    }});
    barTh.appendChild(dateRow);
  }}

  hrow.appendChild(barTh);
  thead.appendChild(hrow);

  // ── BODY ──
  const tbody = document.getElementById("gantt-tbody");
  tbody.innerHTML = "";

  // Group by bloque → proyecto
  const byBloque = {{}};
  filteredTasks.forEach(t => {{
    if (!byBloque[t.bloque]) byBloque[t.bloque] = {{}};
    if (!byBloque[t.bloque][t.proyecto]) byBloque[t.bloque][t.proyecto] = [];
    byBloque[t.bloque][t.proyecto].push(t);
  }});

  const bloqueColors = {{ "3 Meses (Mar-May 2026)": "#FFC000", "May-Oct 2026": "#5B9BD5" }};

  Object.entries(byBloque).forEach(([bloque, proyectos]) => {{
    const bKey = `b::${{bloque}}`;
    const bCollapsed = !!collapsed[bKey];
    const bColor = bloqueColors[bloque] || "#1F3864";

    // ── Bloque group row ──
    const bRow = document.createElement("tr");
    bRow.className = "group-row";
    bRow.style.background = bColor;
    bRow.style.color = "#000";
    bRow.innerHTML = `
      <td colspan="6" style="padding-left:10px;font-size:0.85rem;">
        ${{bCollapsed ? "▶" : "▼"}} <b>${{bloque}}</b>
        <span style="font-size:0.7rem;opacity:0.8;margin-left:8px;">${{Object.values(proyectos).flat().length}} tareas</span>
      </td>
      <td style="background:${{bColor}};min-width:${{totalBarPx}}px;"></td>`;
    bRow.onclick = () => {{ collapsed[bKey] = !collapsed[bKey]; renderAll(); }};
    tbody.appendChild(bRow);
    if (bCollapsed) return;

    Object.entries(proyectos).forEach(([proy, tasks]) => {{
      const pKey = `${{bloque}}::${{proy}}`;
      const pCollapsed = !!collapsed[pKey];
      const avgPct = Math.round(tasks.reduce((s,t) => s + t.pct, 0) / tasks.length);

      // ── Project subgroup row ──
      const pRow = document.createElement("tr");
      pRow.className = "subgroup-row";
      pRow.style.background = "#1F4E79";
      pRow.style.color = "#fff";
      pRow.innerHTML = `
        <td colspan="6" style="padding-left:22px;">
          ${{pCollapsed ? "▶" : "▼"}} ${{proy}}
          <span style="font-size:0.68rem;opacity:0.8;margin-left:8px;">${{tasks.length}} tareas · ${{avgPct}}% avance</span>
        </td>
        <td style="background:#1F4E79;min-width:${{totalBarPx}}px;"></td>`;
      pRow.onclick = (e) => {{ e.stopPropagation(); collapsed[pKey] = !collapsed[pKey]; renderAll(); }};
      tbody.appendChild(pRow);
      if (pCollapsed) return;

      tasks.forEach((t, ti) => {{
        const tRow = document.createElement("tr");
        tRow.className = "task-row";
        tRow.style.background = ti % 2 === 0 ? "#fff" : "#F8FAFC";

        const stColor = STATUS_COLORS[t.estado] || "#A6A6A6";
        const stText  = (["En Progreso","Completado","Bloqueado"].includes(t.estado)) ? "#fff" : "#000";

        // Fixed cells
        const tdId = document.createElement("td");
        tdId.textContent = t.id; tdId.style.textAlign="center"; tdId.style.color="#888";

        const tdName = document.createElement("td");
        tdName.innerHTML = `<div class="task-name">${{t.tarea}}</div><div class="task-meta">📁 ${{t.categoria}}</div>`;

        const tdResp = document.createElement("td");
        tdResp.innerHTML = `<span style="font-size:0.72rem;">👤 ${{t.responsable}}</span>`;

        const tdDates = document.createElement("td");
        tdDates.innerHTML = `<div style="font-size:0.7rem;">${{fmtDate(t.inicio)}}</div><div style="font-size:0.7rem;color:#888;">→ ${{fmtDate(t.fin)}}</div>`;

        const tdStatus = document.createElement("td");
        tdStatus.innerHTML = `<span class="status-badge" style="background:${{stColor}};color:${{stText}}">${{t.estado}}</span>`;

        const tdPct = document.createElement("td");
        tdPct.innerHTML = `
          <div class="pct-text" style="text-align:center;">${{t.pct}}%</div>
          <div style="background:#e0e7ef;border-radius:10px;height:5px;margin:3px 0;">
            <div style="width:${{t.pct}}%;height:5px;border-radius:10px;background:${{stColor}};"></div>
          </div>`;

        // Bar cell
        const tdBar = document.createElement("td");
        tdBar.className = "bar-cell";
        tdBar.style.minWidth = totalBarPx + "px";
        tdBar.style.width = totalBarPx + "px";
        tdBar.style.position = "relative";
        tdBar.style.height = "38px";

        // Calculate bar position
        function dateToPx(dateStr) {{
          const d = parseDate(dateStr), rs = rangeStart;
          const daysFromStart = (d - rs) / 86400000;
          if (currentZoom === "week") return daysFromStart * BAR_WIDTH;
          // month mode: sum months
          let px = 0, cur = new Date(rs.getFullYear(), rs.getMonth(), 1);
          while (cur < d) {{
            const daysInMonth = new Date(cur.getFullYear(), cur.getMonth()+1, 0).getDate();
            const next = new Date(cur.getFullYear(), cur.getMonth()+1, 1);
            if (next <= d) {{ px += daysInMonth * BAR_WIDTH; cur = next; }}
            else {{ px += (d.getDate() - 1) * BAR_WIDTH; break; }}
          }}
          return px;
        }}

        const barLeft  = Math.max(0, dateToPx(t.inicio));
        const barRight = dateToPx(t.fin);
        const barW     = Math.max(4, barRight - barLeft);
        const doneW    = barW * t.pct / 100;

        // Background strip
        const bgDiv = document.createElement("div");
        bgDiv.className = "gantt-bar-bg";
        bgDiv.style.cssText = `left:${{barLeft}}px;width:${{barW}}px;background:${{stColor}};`;
        tdBar.appendChild(bgDiv);

        // Main bar
        const barDiv = document.createElement("div");
        barDiv.className = "gantt-bar";
        barDiv.style.cssText = `left:${{barLeft}}px;width:${{barW}}px;background:${{stColor}};`;
        barDiv.innerHTML = barW > 40 ? `<span class="bar-label">${{t.tarea}}</span>` : "";
        tdBar.appendChild(barDiv);

        // Done portion
        if (t.pct > 0 && t.pct < 100) {{
          const doneDiv = document.createElement("div");
          doneDiv.className = "gantt-bar-done";
          doneDiv.style.cssText = `left:${{barLeft}}px;width:${{doneW}}px;background:rgba(0,0,0,0.3);`;
          tdBar.appendChild(doneDiv);
        }}

        // Tooltip – click to show/hide
        barDiv.style.cursor = "pointer";
        barDiv.addEventListener("click", (e) => {{ e.stopPropagation(); toggleTooltip(e, t); }});
        tdBar.style.cursor  = "pointer";
        tdBar.addEventListener("click",  (e) => {{ e.stopPropagation(); toggleTooltip(e, t); }});

        [tdId, tdName, tdResp, tdDates, tdStatus, tdPct, tdBar].forEach(td => tRow.appendChild(td));
        tbody.appendChild(tRow);
      }});
    }});
  }});

  // ── Today line (month view) ──
  const todayLine = document.getElementById("today-line");
  const today = parseDate(TODAY_STR);
  if (today >= rangeStart && today <= rangeEnd) {{
    function dateToPx2(d) {{
      if (currentZoom === "week") {{
        return (d - rangeStart) / 86400000 * BAR_WIDTH;
      }}
      let px = 0, cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      while (cur < d) {{
        const daysInMonth = new Date(cur.getFullYear(), cur.getMonth()+1, 0).getDate();
        const next = new Date(cur.getFullYear(), cur.getMonth()+1, 1);
        if (next <= d) {{ px += daysInMonth * BAR_WIDTH; cur = next; }}
        else {{ px += (d.getDate() - 1) * BAR_WIDTH; break; }}
      }}
      return px;
    }}
    const FIXED_COLS_PX = 40+260+110+130+95+80; // approximate fixed cols width
    // We'll overlay AFTER the table renders
    setTimeout(() => {{
      const tableEl = document.getElementById("gantt-table");
      const scrollEl = document.getElementById("gantt-scroll");
      const barColStart = tableEl.querySelector("thead tr th:last-child")?.offsetLeft || 0;
      const todayPx = dateToPx2(today);
      todayLine.style.left = (barColStart + todayPx) + "px";
      todayLine.style.height = tableEl.offsetHeight + "px";
      todayLine.style.display = "block";
    }}, 50);
  }} else {{
    todayLine.style.display = "none";
  }}
}}

// ─── TOOLTIP ─────────────────────────────────────────
let _ttActiveId = null;

function toggleTooltip(e, t) {{
  const tt = document.getElementById("tooltip");
  if (_ttActiveId === t.id && tt.style.display === "block") {{
    tt.style.display = "none"; _ttActiveId = null; return;
  }}
  _ttActiveId = t.id;
  const stColor = STATUS_COLORS[t.estado] || "#A6A6A6";
  tt.innerHTML = `
    <button onclick="hideTooltip()" style="position:absolute;top:7px;right:10px;background:transparent;border:none;color:#aaa;font-size:1rem;cursor:pointer;line-height:1;" title="Cerrar">✕</button>
    <div class="tt-title" style="padding-right:18px">${{t.tarea}}</div>
    <div class="tt-row"><span class="tt-key">Proyecto:</span><span>${{t.proyecto}}</span></div>
    <div class="tt-row"><span class="tt-key">Bloque:</span><span>${{t.bloque}}</span></div>
    <div class="tt-row"><span class="tt-key">Responsable:</span><span>${{t.responsable}}</span></div>
    <div class="tt-sep"></div>
    <div class="tt-row"><span class="tt-key">Inicio:</span><span>${{fmtDate(t.inicio)}}</span></div>
    <div class="tt-row"><span class="tt-key">Fin:</span><span>${{fmtDate(t.fin)}}</span></div>
    <div class="tt-row"><span class="tt-key">Duración:</span><span>${{t.dias}} días</span></div>
    <div class="tt-sep"></div>
    <div class="tt-row"><span class="tt-key">Estado:</span><span style="color:${{stColor}};font-weight:700;">${{t.estado}}</span></div>
    <div class="tt-row"><span class="tt-key">% Avance:</span><span>${{t.pct}}%</span></div>
    ${{t.notas ? `<div class="tt-sep"></div><div class="tt-row"><span class="tt-key">Notas:</span><span>${{t.notas}}</span></div>` : ""}}
    ${{t.desc ? `<div class="tt-sep"></div><div style="font-size:0.7rem;color:#ccc;margin-top:4px;">${{t.desc}}</div>` : ""}}
  `;
  // position near click, auto-flip if out of viewport
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + 340 > window.innerWidth)  x = e.clientX - 350;
  if (y + 300 > window.innerHeight) y = e.clientY - 310;
  tt.style.left = x + "px"; tt.style.top = y + "px";
  tt.style.display = "block";
}}
function hideTooltip() {{
  document.getElementById("tooltip").style.display = "none";
  _ttActiveId = null;
}}

// ─── COLLAPSE HELPERS ───────────────────────────────
function expandAll()   {{ collapsed = {{}}; renderAll(); }}
function collapseAll() {{
  const byBloque = {{}};
  filteredTasks.forEach(t => {{
    if (!byBloque[t.bloque]) byBloque[t.bloque] = {{}};
    byBloque[t.bloque][t.proyecto] = true;
  }});
  Object.keys(byBloque).forEach(b => {{
    Object.keys(byBloque[b]).forEach(p => {{ collapsed[`${{b}}::${{p}}`] = true; }});
  }});
  renderAll();
}}

// ─── ZOOM ────────────────────────────────────────────
function setZoom(z) {{
  currentZoom = z;
  ["week","month","all"].forEach(k => {{
    document.getElementById("zoom-" + k).classList.toggle("active", k === z);
  }});
  renderAll();
}}

// ─── CLOSE TOOLTIP ON OUTSIDE CLICK ────────────────
document.addEventListener("click", (e) => {{
  const tt = document.getElementById("tooltip");
  if (tt && tt.style.display === "block" && !tt.contains(e.target)) hideTooltip();
}});

// ─── INIT ────────────────────────────────────────────
window.onload = () => {{
  initFilters();
  renderProyCards();
  renderAll();
}};
</script>
</body>
</html>"""

    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✅  Gantt HTML generado: {OUTPUT_HTML}")
    print(f"   Abre el archivo en tu navegador para ver el diagrama interactivo.")
    print(f"   Tareas cargadas: {len(tasks)}")
    print(f"   Proyectos: {len(proy_stats)}")
    print(f"   Avance global actual: {pct_global}%")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
if __name__ == "__main__":
    print(f"📖 Leyendo: {EXCEL_FILE} ...")
    df = cargar_datos()
    print(f"   {len(df)} tareas cargadas.")
    generar_html(df)
