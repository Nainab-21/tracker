import { NextResponse, NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import type { PlanningTask, TaskStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PLANNING_SHAREPOINT_URL =
  'https://findabilitysciences-my.sharepoint.com/:x:/p/bnaina/IQBV4slET1weR4Wihzp0LDO3AUsQwstKbpIi2WXxV89AviM?e=Mcrb2O';

async function fetchSharePointExcel(shareUrl: string): Promise<Buffer> {
  const baseUrl = 'https://findabilitysciences-my.sharepoint.com';

  // Step 1: hit the sharing link with &download=1 — SharePoint returns a 302
  // with a FedAuth cookie and a relative Location to the actual file.
  const resp1 = await fetch(`${shareUrl}&download=1`, { redirect: 'manual' });

  const location = resp1.headers.get('location');
  const rawCookie = resp1.headers.get('set-cookie');

  if (!location || !rawCookie) {
    throw new Error(`SharePoint redirect handshake failed (status ${resp1.status})`);
  }

  // Extract just the cookie name=value part (strip attributes like path, SameSite…)
  const cookie = rawCookie.split(';')[0];

  // Step 2: fetch the actual file using the cookie for auth.
  const fileUrl = location.startsWith('/') ? `${baseUrl}${location}` : location;
  const resp2 = await fetch(fileUrl, { headers: { Cookie: cookie } });

  if (!resp2.ok) {
    throw new Error(`Failed to download Excel from SharePoint (${resp2.status})`);
  }

  return Buffer.from(await resp2.arrayBuffer());
}

// ── Translation maps ──────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, TaskStatus> = {
  'En Progreso': 'In Progress',
  'Pendiente': 'Pending',
  'Completado': 'Completed',
  'Bloqueado': 'Blocked',
  'En Revisión': 'Under Review',
  // already-English values (pass through)
  'In Progress': 'In Progress',
  'Pending': 'Pending',
  'Completed': 'Completed',
  'Blocked': 'Blocked',
  'Under Review': 'Under Review',
};

const PROJECT_MAP: Record<string, string> = {
  'Teledetección – Feedback PSH': 'Remote Sensing – PSH Feedback',
  'App Móvil Teledetección [E2E]': 'Mobile App Remote Sensing [E2E]',
  'Movilidad Empresarial [Modelos|Lab|Op]': 'Enterprise Mobility [Models|Lab|Ops]',
  'Modelos IA – Pol|Maduración|TCH|Caña': 'AI Models – Pol|Maturation|TCH|Cane',
  'Frescura de Caña': 'Cane Freshness',
  'Salud Financiera | Rentabilidad Fincas': 'Financial Health | Farm Profitability',
  'IoT Analytics – Telemetría [Riesgos]': 'IoT Analytics – Telemetry [Risks]',
  'IoT – Movilidad Empresarial [Avance Labores]': 'IoT – Enterprise Mobility [Field Work Progress]',
  'Módulo Operacional – Módulo de Riego': 'Operational Module – Irrigation Module',
};

const CATEGORY_MAP: Record<string, string> = {
  'Móvil': 'Mobile',
  'Movilidad': 'Mobility',
  'Modelos IA': 'AI Models',
  'Módulo Operacional': 'Operational Module',
};

const TEAM_MAP: Record<string, string> = {
  'Equipo IA': 'AI Team',
  'Equipo IA + Producto': 'AI Team + Product',
  'Producto': 'Product',
  'Producto + IoT': 'Product + IoT',
  'Laboratorio': 'Laboratory',
  'Operaciones': 'Operations',
  'Campo': 'Field Team',
  'QA + Campo': 'QA + Field',
  'QA + Usuarios': 'QA + Users',
  'Negocio + IA': 'Business + AI',
};

const TASK_MAP: Record<string, string> = {
  'Backlog Stoma Sense': 'StomaSense Backlog Review',
  'Curvas potenciales y SGI': 'Potential Curves and SGI',
  'Modelo de Humedad ajustado y validado ': 'Adjusted & Validated Humidity Model',
  'Modelo Cloudfill desplegado ': 'Cloudfill Model Deployment',
  'Actualización de datos de clientes (Manual, Correo, API)': 'Client Data Update (Manual, Email, API)',
  'Migracion de clientes TA ': 'TA Client Migration',
  'Migrar los modelos de los Clientes TA ': 'Migrate TA Client Models',
  'Issue Review & Diagnóstico': 'Issue Review & Diagnosis',
  'Integracion de dashboard completo.': 'Full Dashboard Integration',
  'Modelos – Integración de modelos IA': 'Models – AI Model Integration',
  'Laboratorio – Configuración de ambiente': 'Laboratory – Environment Setup',
  'Operación – Flujo operativo': 'Operations – Operational Flow',
  'Integración Modelos-Lab-Operación': 'Models–Lab–Operations Integration',
  'Pruebas end-to-end': 'End-to-End Testing',
  'Recopilación y limpieza de datos': 'Data Collection & Cleaning',
  'Entrenamiento modelo Pol (polarimetría)': 'Pol Model Training (Polarimetry)',
  'Entrenamiento modelo Maduración': 'Maturation Model Training',
  'Entrenamiento modelo TCH (Toneladas Caña/Ha)': 'TCH Model Training (Tons of Cane/Ha)',
  'Modelo Caña / No Caña (clasificación)': 'Cane / No-Cane Classifier',
  'Validación y ajuste de modelos': 'Model Validation & Tuning',
  'Integración a plataforma': 'Platform Integration',
  'Diseño del modelo de frescura': 'Freshness Model Design',
  'Recolección de datos sensoriales': 'Sensor Data Collection',
  'Entrenamiento modelo frescura': 'Freshness Model Training',
  'Validación en campo': 'Field Validation',
  'Despliegue productivo': 'Production Deployment',
  'Levantamiento de indicadores financieros': 'Financial Indicators Survey',
  'Integración de datos financieros': 'Financial Data Integration',
  'Desarrollo modelos predictivos financieros': 'Financial Predictive Model Development',
  'Dashboard de rentabilidad y salud financiera': 'Financial Health & Profitability Dashboard',
  'Definición de alertas y umbrales de riesgo': 'Risk Alert & Threshold Definition',
  'Integración de sensores IoT': 'IoT Sensor Integration',
  'Desarrollo dashboard de telemetría': 'Telemetry Dashboard Development',
  'Testing y calibración de sensores': 'Sensor Testing & Calibration',
  'Despliegue productivo telemetría': 'Telemetry Production Deployment',
  'Diseño del flujo de avance de labores': 'Field Work Progress Flow Design',
  'Integración con módulos existentes': 'Integration with Existing Modules',
  'Pruebas con usuarios (UAT)': 'User Acceptance Testing (UAT)',
  'Ajustes finales y despliegue': 'Final Adjustments & Deployment',
  'Requerimientos y diseño funcional': 'Requirements & Functional Design',
  'Desarrollo core del módulo': 'Core Module Development',
  'Integración con telemetría de sensores': 'Sensor Telemetry Integration',
  'Testing en campo': 'Field Testing',
  'Despliegue y capacitación': 'Deployment & Training',
};

const DESCRIPTION_MAP: Record<string, string> = {
  'Revisión de issues reportados en módulo de teledetección (NDVI+, Hydro Plus, Smart Growth, Weed Detection) + metricas':
    'Review of reported issues in the remote sensing module (NDVI+, Hydro Plus, Smart Growth, Weed Detection) + metrics',
  'Curvas potenciales y rangos de reclasificacion corregidos para el calculo de SGI':
    'Corrected potential curves and reclassification ranges for SGI calculation',
  'Validacion de modelo CA con las nuevas muestras y Modelo MX promedio':
    'CA model validation with new samples and average MX model',
  'Version productiva y pruebas de coherencia temporal en las 5 unidades de negocio':
    'Production version and temporal coherence tests across the 5 business units',
  'Correcciones y mejoras identificadas en la sesión PSH':
    'Corrections and improvements identified in the PSH session',
  'Migrar los clientes de TA al nuevo portal con todos los ':
    'Migrate TA clients to the new portal with all their data',
  'Migrar los modelos de los clientes de TA':
    'Migrate TA client models to the new environment',
  'entrega funcional y técnico de la app móvil end-to-end':
    'Functional and technical end-to-end mobile app delivery',
  'Dashbaord completo': 'Complete dashboard integration',
  'Integración de modelos existentes al flujo de movilidad empresarial':
    'Integration of existing models into the enterprise mobility workflow',
  'Setup del entorno de laboratorio para pruebas de movilidad':
    'Laboratory environment setup for mobility testing',
  'Configuración y documentación del flujo operativo':
    'Configuration and documentation of the operational workflow',
  'Articulación de los tres componentes en pipeline unificado':
    'Integration of the three components into a unified pipeline',
  'Validación integral del flujo completo': 'Comprehensive end-to-end flow validation',
  'Consolidación de datasets históricos para entrenamiento de modelos':
    'Consolidation of historical datasets for model training',
  'Fejuste y entrenamiento del modelo de Pol en caña':
    'Fine-tuning and training of the Pol model for sugarcane',
  'Modelo predictivo de maduración de caña': 'Predictive model for sugarcane maturation',
  'Predicción de rendimiento TCH': 'TCH yield prediction (Tons of Cane per Hectare)',
  'Clasificador binario de presencia de caña en imágenes satelitales':
    'Binary classifier for cane presence detection in satellite imagery',
  'Validación cruzada, métricas en campo y ajuste de hiperparámetros':
    'Cross-validation, field metrics, and hyperparameter tuning',
  'Despliegue de modelos como microservicios en la plataforma':
    'Deployment of models as microservices on the platform',
  'Definición de features, metodología y métricas del modelo':
    'Feature definition, methodology, and model metrics',
  'Captura de datos en campo (imágenes, sensores, muestras)':
    'Field data capture (images, sensors, samples)',
  'Entrenamiento y evaluación del modelo': 'Model training and evaluation',
  'Pruebas reales y comparación con método convencional':
    'Real-world testing and comparison with conventional method',
  'Publicación del modelo en producción': 'Publishing the model to production',
  'Definición de KPIs de rentabilidad y salud financiera por finca':
    'Definition of profitability and financial health KPIs per farm',
  'Conexión con fuentes de datos contables/ERP': 'Connection to accounting/ERP data sources',
  'Modelos de predicción de rentabilidad y alertas de salud financiera':
    'Profitability prediction models and financial health alerts',
  'Visualización interactiva de indicadores financieros por finca':
    'Interactive visualization of financial indicators per farm',
  'Catálogo de riesgos, umbrales y lógica de alertas IoT':
    'Risk catalog, thresholds, and IoT alert logic',
  'Conexión y configuración de sensores de riego, clima, suelo':
    'Connection and configuration of irrigation, weather, and soil sensors',
  'Panel en tiempo real de métricas y alertas de riesgo':
    'Real-time metrics and risk alert dashboard',
  'Validación de precisión y calibración en campo':
    'Field accuracy validation and sensor calibration',
  'Go-live del sistema de telemetría con alertas en producción':
    'Go-live of telemetry system with production alerts',
  'Mapeo del proceso de reporte de avance de labores en campo':
    'Mapping of the field work progress reporting process',
  'Conexión con módulos operacionales y de movilidad ya desplegados':
    'Connection with operational and mobility modules already deployed',
  'Sesiones de prueba con usuarios de campo, iteraciones':
    'Field user testing sessions with iterative improvements',
  'Correcciones post-UAT y go-live': 'Post-UAT corrections and go-live',
  'Especificación funcional y técnica del módulo de riego':
    'Functional and technical specification of the irrigation module',
  'Implementación de lógica de negocio, algoritmos de riego':
    'Business logic implementation and irrigation algorithms',
  'Conexión con sensores de humedad, clima y actuadores de riego':
    'Connection with humidity/weather sensors and irrigation actuators',
  'Pruebas reales en fincas piloto': 'Real-world testing at pilot farms',
  'Go-live, documentación y capacitación a usuarios finales':
    'Go-live, documentation, and end-user training',
};

const NOTES_MAP: Record<string, string> = {
  'Dependencia: telemetría': 'Dependency: telemetry',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function tr(map: Record<string, string>, val: string): string {
  return map[val] ?? val;
}

function excelSerialToISO(serial: number): string {
  // Excel date serial → JS Date (Excel epoch starts 1900-01-00)
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date.toISOString().split('T')[0];
}

function parseDate(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel stored these cells using M/D/YYYY (US locale) but the sheet uses D/M/YYYY.
    // Decode the serial to get the "as-stored" ISO date (e.g. "2026-10-03" for 10/3/2026),
    // then swap month and day to recover the intended D/M date (→ "2026-03-10").
    const iso = excelSerialToISO(val);        // always UTC, no tz ambiguity
    const [y, m, d] = iso.split('-');
    return `${y}-${d}-${m}`;                  // swap: M/D → D/M
  }
  if (typeof val === 'string') {
    const s = val.trim();
    // DD-MM-YYYY or D-M-YYYY (dashes, European/Spanish format – stored as text)
    const dashMatch = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dashMatch) {
      const [, d, m, y] = dashMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // DD/MM/YYYY or D/M/YYYY (slashes – stored as text, D/M/YYYY)
    const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const [, d, m, y] = slashMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return s;
  }
  return String(val);
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Serve the committed snapshot when ?week=previous
  if (request.nextUrl.searchParams.get('week') === 'previous') {
    try {
      const snapshot = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'snapshots', 'planning.json'), 'utf-8')
      );
      if (!snapshot.tasks?.length) {
        return NextResponse.json(
          { error: 'No snapshot available yet', detail: "Run 'npm run snapshot' and commit the result." },
          { status: 404 }
        );
      }
      return NextResponse.json(snapshot);
    } catch (err) {
      return NextResponse.json(
        { error: 'Snapshot not found', detail: String(err) },
        { status: 404 }
      );
    }
  }

  try {
    const buffer = await fetchSharePointExcel(PLANNING_SHAREPOINT_URL);
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    const tasks: PlanningTask[] = [];

    for (let i = 3; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      if (!row[0]) continue; // skip empty rows

      const rawTask = String(row[4] ?? '').trim();
      const rawDesc = String(row[5] ?? '').trim();
      const rawTeam = String(row[6] ?? '').trim();
      const rawProject = String(row[2] ?? '').trim();
      const rawCategory = String(row[3] ?? '').trim();
      const rawStatus = String(row[11] ?? '').trim();
      const rawNotes = row[12] ? String(row[12]).trim() : null;

      // Days: may be a formula string or a number
      let days = 0;
      const rawDays = row[9];
      if (typeof rawDays === 'number') days = rawDays;

      const progress = typeof row[10] === 'number' ? row[10] : 0;
      const endDate = parseDate(row[8]);
      const today = new Date().toISOString().split('T')[0];

      let status: TaskStatus = STATUS_MAP[rawStatus] ?? 'Pending';
      if (progress >= 100) {
        status = 'Completed';
      } else if (endDate && endDate < today && status !== 'Completed') {
        status = 'Delayed';
      }

      tasks.push({
        id: Number(row[0]),
        block: String(row[1] ?? '').trim(),
        project: tr(PROJECT_MAP, rawProject),
        category: tr(CATEGORY_MAP, rawCategory),
        task: TASK_MAP[rawTask] ?? rawTask,
        description: DESCRIPTION_MAP[rawDesc] ?? rawDesc,
        team: TEAM_MAP[rawTeam] ?? rawTeam,
        startDate: parseDate(row[7]),
        endDate,
        days,
        progress,
        status,
        notes: rawNotes ? (NOTES_MAP[rawNotes] ?? rawNotes) : null,
        updated: String(row[13] ?? '').trim(),
      });
    }

    return NextResponse.json({ tasks, lastFetched: new Date().toISOString() });
  } catch (err) {
    console.error('Planning API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch planning data', detail: String(err) },
      { status: 500 }
    );
  }
}
