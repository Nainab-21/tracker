'use client';

import { useMemo, useState } from 'react';
import type { PlanningTask, TaskStatus } from '@/lib/types';

interface Props { tasks: PlanningTask[] }

type ViewMode = 'gantt' | 'timeline';

// ── Timeline ──────────────────────────────────────────────────────────────────
const RANGE_START = new Date('2026-03-01');
const RANGE_END   = new Date('2026-11-01');
const TOTAL_MS    = RANGE_END.getTime() - RANGE_START.getTime();

const MONTHS = [
  { label: 'Mar', start: new Date('2026-03-01') },
  { label: 'Apr', start: new Date('2026-04-01') },
  { label: 'May', start: new Date('2026-05-01') },
  { label: 'Jun', start: new Date('2026-06-01') },
  { label: 'Jul', start: new Date('2026-07-01') },
  { label: 'Aug', start: new Date('2026-08-01') },
  { label: 'Sep', start: new Date('2026-09-01') },
  { label: 'Oct', start: new Date('2026-10-01') },
];

function pct(ms: number) { return (ms / TOTAL_MS) * 100; }
function leftPct(d: Date)  { return Math.max(0, pct(d.getTime() - RANGE_START.getTime())); }
function widthPct(s: Date, e: Date) { return Math.max(0.5, pct(e.getTime() - s.getTime())); }

// ── Status ────────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<TaskStatus, string> = {
  'In Progress':  '#5B9BD5',
  'Pending':      '#A6A6A6',
  'Completed':    '#70AD47',
  'Blocked':      '#C00000',
  'Under Review': '#FFD966',
  'Delayed':      '#FF8C00',
};
const STATUS_TEXT_COLOR: Record<TaskStatus, string> = {
  'In Progress':  '#fff',
  'Pending':      '#fff',
  'Completed':    '#fff',
  'Blocked':      '#fff',
  'Under Review': '#1a1a2e',
  'Delayed':      '#fff',
};

// ── Project palette (matches original HTML) ───────────────────────────────────
const PROY_COLORS = [
  '#264478','#2E75B6','#AE5A00','#538135',
  '#7030A0','#C55A11','#17375E','#833C00','#1F4E79',
];

function fmt(s: string) {
  if (!s) return '—';
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPI({ val, lbl, color }: { val: number | string; lbl: string; color: string }) {
  return (
    <div style={{
      background: '#F0F4F8', borderRadius: 8, padding: '10px 8px',
      textAlign: 'center', border: '1px solid #dde3ed', flex: 1,
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{val}</div>
      <div style={{ fontSize: '0.68rem', color: '#666', marginTop: 2 }}>{lbl}</div>
    </div>
  );
}

// ── Timeline sub-component ────────────────────────────────────────────────────
function TimelineView({ tasks, projectColorMap }: { tasks: PlanningTask[]; projectColorMap: Record<string, string> }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sort by proximity to today (tasks active today first, then upcoming, then past)
  const sorted = [...tasks].sort((a, b) => {
    const aStart = new Date(a.startDate + 'T00:00:00');
    const aEnd   = new Date(a.endDate   + 'T00:00:00');
    const bStart = new Date(b.startDate + 'T00:00:00');
    const bEnd   = new Date(b.endDate   + 'T00:00:00');

    const aActive = aStart <= today && today <= aEnd;
    const bActive = bStart <= today && today <= bEnd;
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;

    // Upcoming: distance from today to start
    const aDist = aStart > today ? aStart.getTime() - today.getTime() : today.getTime() - aEnd.getTime();
    const bDist = bStart > today ? bStart.getTime() - today.getTime() : today.getTime() - bEnd.getTime();
    return aDist - bDist;
  });

  // Timeline range: 30 days before today to 120 days after
  const viewStart = new Date(today); viewStart.setDate(viewStart.getDate() - 30);
  const viewEnd   = new Date(today); viewEnd.setDate(viewEnd.getDate() + 120);
  const viewMs    = viewEnd.getTime() - viewStart.getTime();
  const todayPct  = ((today.getTime() - viewStart.getTime()) / viewMs) * 100;

  function barL(d: Date) { return Math.max(0, Math.min(100, ((d.getTime() - viewStart.getTime()) / viewMs) * 100)); }
  function barW(s: Date, e: Date) { return Math.max(0.5, Math.min(100 - barL(s), ((e.getTime() - s.getTime()) / viewMs) * 100)); }

  // Month labels for the timeline header
  const monthLabels: { label: string; pct: number }[] = [];
  const cur = new Date(viewStart.getFullYear(), viewStart.getMonth(), 1);
  while (cur <= viewEnd) {
    const p = ((cur.getTime() - viewStart.getTime()) / viewMs) * 100;
    if (p >= 0 && p <= 100) {
      monthLabels.push({ label: cur.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), pct: p });
    }
    cur.setMonth(cur.getMonth() + 1);
  }

  const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div style={{ padding: '0 0 12px 0' }}>
      {/* Timeline ruler — same flex layout as rows so today line aligns */}
      <div style={{ display: 'flex', height: 32, borderBottom: '1px solid #dde3ed', background: '#f8fafc' }}>
        {/* Spacer matching the fixed info panel */}
        <div style={{ width: 180, flexShrink: 0, borderRight: '1px solid #eef2f8', display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
          <span style={{ fontSize: '0.65rem', color: '#999', fontStyle: 'italic' }}>sorted by proximity</span>
        </div>
        {/* Ruler bar area — same flex:1 as each row's bar area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {monthLabels.map(m => (
            <div key={m.label} style={{ position: 'absolute', left: `${m.pct}%`, top: 0, bottom: 0, display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, background: '#dde3ed' }} />
              <span style={{ fontSize: '0.68rem', color: '#5c7da8', fontWeight: 600, whiteSpace: 'nowrap' }}>{m.label}</span>
            </div>
          ))}
          {/* Today marker */}
          <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0, width: 2, background: '#C00000', zIndex: 5 }}>
            <span style={{ position: 'absolute', top: 4, left: 4, fontSize: '0.65rem', color: '#C00000', fontWeight: 700, whiteSpace: 'nowrap' }}>Today · {fmtDay(today)}</span>
          </div>
        </div>
      </div>

      {/* Task rows */}
      <div style={{ position: 'relative' }}>

        {sorted.map((task, idx) => {
          const sDate   = new Date(task.startDate + 'T00:00:00');
          const eDate   = new Date(task.endDate   + 'T00:00:00');
          const isActive = sDate <= today && today <= eDate;
          const isPast   = eDate < today;
          const color    = projectColorMap[task.project] ?? '#2E75B6';
          const statusCol = STATUS_COLOR[task.status];
          const bL = barL(sDate);
          const bW = barW(sDate, eDate);
          const rowBg = isActive ? '#FFFBE6' : idx % 2 === 0 ? '#fff' : '#f8fafc';

          return (
            <div key={`${task.id}-${task.task}-${idx}`}
              style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #eef2f8', background: rowBg, opacity: isPast ? 0.65 : 1 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0f4f8')}
              onMouseLeave={e => (e.currentTarget.style.background = rowBg)}>

              {/* Left info panel (fixed width) */}
              <div style={{ width: 180, flexShrink: 0, padding: '6px 10px', borderRight: '1px solid #eef2f8' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1a1a2e', lineHeight: 1.3 }}>{task.task}</div>
                <div style={{ fontSize: '0.65rem', color: color, marginTop: 2, fontWeight: 600 }}>{task.project}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
                  <span style={{ display: 'inline-block', padding: '1px 5px', borderRadius: 8, fontSize: '0.62rem', fontWeight: 700, background: statusCol, color: STATUS_TEXT_COLOR[task.status] }}>
                    {task.status}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#888' }}>{task.progress}%</span>
                </div>
              </div>

              {/* Timeline bar area */}
              <div style={{ flex: 1, position: 'relative', height: 44, overflow: 'hidden' }}>
                {/* Month grid lines */}
                {monthLabels.map(m => (
                  <div key={m.label} style={{ position: 'absolute', left: `${m.pct}%`, top: 0, bottom: 0, width: 1, background: '#eef2f8', zIndex: 1 }} />
                ))}
                {/* Today line in this row */}
                <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0, width: 2, background: 'rgba(192,0,0,0.35)', zIndex: 3 }} />

                {/* Bar background */}
                <div style={{
                  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                  left: `${bL}%`, width: `${bW}%`,
                  height: 24, borderRadius: 4,
                  background: color, opacity: 0.15,
                  zIndex: 2,
                }} />
                {/* Progress fill */}
                <div style={{
                  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                  left: `${bL}%`, width: `${bW * task.progress / 100}%`,
                  height: 24, borderRadius: 4,
                  background: color, opacity: 0.8,
                  zIndex: 2,
                }} />
                {/* Label on bar */}
                <div style={{
                  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                  left: `${bL}%`, width: `${bW}%`,
                  height: 24, display: 'flex', alignItems: 'center',
                  paddingLeft: 6, overflow: 'hidden', zIndex: 4,
                }}>
                  <span style={{ fontSize: '0.62rem', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                    {fmtDay(sDate)} – {fmtDay(eDate)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <p style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No tasks match the current filters.</p>
      )}
    </div>
  );
}

export default function GanttSection({ tasks }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('gantt');
  const [blockFilter,   setBlockFilter]   = useState('All');
  const [statusFilter,  setStatusFilter]  = useState('All');
  const [teamFilter,    setTeamFilter]    = useState('All');
  const [search,        setSearch]        = useState('');
  const [collapsedBlocks,   setCollapsedBlocks]   = useState<Set<string>>(new Set());
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());

  const blocks   = useMemo(() => ['All', ...Array.from(new Set(tasks.map(t => t.block)))],   [tasks]);
  const statuses = useMemo(() => ['All', ...Array.from(new Set(tasks.map(t => t.status)))],  [tasks]);
  const teams    = useMemo(() => ['All', ...Array.from(new Set(tasks.map(t => t.team))).sort()], [tasks]);

  // KPIs
  const total      = tasks.length;
  const completed  = tasks.filter(t => t.status === 'Completed').length;
  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const blocked    = tasks.filter(t => t.status === 'Blocked').length;
  const pending    = tasks.filter(t => t.status === 'Pending').length;
  const delayed    = tasks.filter(t => t.status === 'Delayed').length;
  const globalPct  = total ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / total) : 0;

  // Stable project → color index
  const projectColorMap = useMemo(() => {
    const projects = Array.from(new Set(tasks.map(t => t.project)));
    return Object.fromEntries(projects.map((p, i) => [p, PROY_COLORS[i % PROY_COLORS.length]]));
  }, [tasks]);

  // Filtered + grouped
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tasks.filter(t => {
      if (blockFilter  !== 'All' && t.block  !== blockFilter)  return false;
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      if (teamFilter   !== 'All' && t.team   !== teamFilter)   return false;
      if (q && !t.task.toLowerCase().includes(q) && !t.project.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, blockFilter, statusFilter, teamFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, PlanningTask[]>>();
    for (const t of filtered) {
      if (!map.has(t.block)) map.set(t.block, new Map());
      const pm = map.get(t.block)!;
      if (!pm.has(t.project)) pm.set(t.project, []);
      pm.get(t.project)!.push(t);
    }
    return map;
  }, [filtered]);


  // Today line position
  const todayLeft = useMemo(() => {
    const p = leftPct(new Date());
    return p >= 0 && p <= 100 ? p : null;
  }, []);

  const toggleBlock   = (b: string) => setCollapsedBlocks(prev => { const n = new Set(prev); n.has(b) ? n.delete(b) : n.add(b); return n; });
  const toggleProject = (p: string) => setCollapsedProjects(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });

  // Input / select shared style
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '5px 8px', border: '1px solid #cdd4df',
    borderRadius: 6, fontSize: '0.8rem', background: '#f8fafc', color: '#1a1a2e',
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 0 }}>

      {/* ── SIDEBAR ───────────────────────────────────────────────────────── */}
      <div style={{
        width: 270, minWidth: 220, background: '#fff',
        borderRight: '1px solid #dde3ed', borderRadius: '10px 0 0 10px',
        overflowY: 'auto', padding: 16, flexShrink: 0,
      }}>
        {/* Global summary */}
        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: '#5c7da8', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #eef2f8' }}>
          📊 Global Summary
        </div>

        {/* On-Track / Needs Attention badge */}
        {(() => {
          const now = new Date(); now.setHours(0, 0, 0, 0);
          const needsAttention = delayed > 0 || blocked > 0 ||
            tasks.some(t => new Date(t.endDate + 'T00:00:00') < now && t.status !== 'Completed');
          return (
            <div style={{
              marginBottom: 16, borderRadius: 8, padding: '10px 12px', textAlign: 'center',
              background: needsAttention ? '#FFF2F2' : '#F0FFF4',
              border: `1px solid ${needsAttention ? '#C00000' : '#538135'}`,
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: needsAttention ? '#C00000' : '#538135' }}>
                {needsAttention ? '⚠ Needs Attention' : '✅ On-Track'}
              </div>
            </div>
          );
        })()}

        {/* Filters */}
        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: '#5c7da8', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #eef2f8' }}>
          🔍 Filters
        </div>
        {[
          { label: 'Block',   value: blockFilter,  set: setBlockFilter,  opts: blocks },
          { label: 'Status',  value: statusFilter, set: setStatusFilter, opts: statuses },
          { label: 'Team',    value: teamFilter,   set: setTeamFilter,   opts: teams },
        ].map(({ label, value, set, opts }) => (
          <div key={label} style={{ marginBottom: 8 }}>
            <label style={{ fontSize: '0.72rem', color: '#555', display: 'block', marginBottom: 3 }}>{label}</label>
            <select value={value} onChange={e => set(e.target.value)} style={inputStyle}>
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: '0.72rem', color: '#555', display: 'block', marginBottom: 3 }}>Search task</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Type to search…" style={inputStyle} />
        </div>
        <button
          onClick={() => { setBlockFilter('All'); setStatusFilter('All'); setTeamFilter('All'); setSearch(''); }}
          style={{ width: '100%', marginTop: 4, marginBottom: 16, padding: '7px', background: '#2E75B6', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}
        >
          ↺ Clear filters
        </button>

      </div>

      {/* ── MAIN GANTT ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', borderRadius: '0 10px 10px 0' }}>
        <div style={{ background: '#fff', borderRadius: '0 10px 10px 0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

          {/* Controls bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #eef2f8', background: '#f8fafc', flexWrap: 'wrap' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: '#e0e7ef', borderRadius: 7, padding: 2, gap: 2 }}>
              {(['gantt', 'timeline'] as ViewMode[]).map(v => (
                <button key={v} onClick={() => setViewMode(v)} style={{
                  padding: '4px 14px', borderRadius: 5, border: 'none', cursor: 'pointer',
                  fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s',
                  background: viewMode === v ? '#1F3864' : 'transparent',
                  color: viewMode === v ? '#fff' : '#555',
                }}>
                  {v === 'gantt' ? '📋 Gantt' : '📅 Timeline'}
                </button>
              ))}
            </div>

            {viewMode === 'gantt' && (
              <>
                {[{ label: '▼ Expand All', action: () => { setCollapsedBlocks(new Set()); setCollapsedProjects(new Set()); } },
                  { label: '▲ Collapse All', action: () => setCollapsedBlocks(new Set(grouped.keys())) }
                ].map(({ label, action }) => (
                  <button key={label} onClick={action} style={{ padding: '5px 14px', borderRadius: 5, fontSize: '0.78rem', cursor: 'pointer', border: '1px solid #cdd4df', background: '#fff', color: '#1a1a2e', fontWeight: 600 }}>
                    {label}
                  </button>
                ))}
                <span style={{ color: '#888', fontSize: '0.75rem' }}>Click block / project to collapse</span>
              </>
            )}
            {viewMode === 'timeline' && (
              <span style={{ color: '#888', fontSize: '0.75rem' }}>Tasks sorted by proximity to today · bars show actual duration</span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#555' }}>
              {filtered.length} / {total} tasks
            </span>
          </div>

          {/* ── Timeline View ──────────────────────────────────────────── */}
          {viewMode === 'timeline' && (
            <TimelineView tasks={filtered} projectColorMap={projectColorMap} />
          )}

          {/* Table */}
          {viewMode === 'gantt' && <div style={{ overflowX: 'auto', position: 'relative' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  <th style={{ background: '#1F3864', color: '#fff', padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 10, minWidth: 220 }}>Task</th>
                  <th style={{ background: '#1F3864', color: '#fff', padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 10, minWidth: 100 }}>Team</th>
                  <th style={{ background: '#1F3864', color: '#fff', padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 10, width: 70 }}>Progress</th>
                  <th style={{ background: '#1F3864', color: '#fff', padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 10, width: 90 }}>Status</th>
                  {/* Month columns */}
                  {MONTHS.map(m => (
                    <th key={m.label} style={{ background: '#1F3864', color: '#fff', padding: '4px 2px', textAlign: 'center', fontSize: '0.68rem', minWidth: 80, position: 'sticky', top: 0, zIndex: 10, borderLeft: '1px solid rgba(255,255,255,0.15)' }}>
                      {m.label} 2026
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from(grouped.entries()).map(([block, projects]) => (
                  <>
                    {/* Block row */}
                    <tr key={`block-${block}`} style={{ background: '#1F3864', color: '#fff', cursor: 'pointer' }}
                      onClick={() => toggleBlock(block)}>
                      <td colSpan={4} style={{ padding: '8px 12px', fontWeight: 700, fontSize: '0.82rem' }}>
                        {collapsedBlocks.has(block) ? '▶' : '▼'} {block}
                        <span style={{ opacity: 0.7, fontWeight: 400, fontSize: '0.75rem', marginLeft: 8 }}>({projects.size} projects)</span>
                      </td>
                      {MONTHS.map(m => <td key={m.label} style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', padding: 0, background: '#1F3864' }} />)}
                    </tr>

                    {!collapsedBlocks.has(block) && Array.from(projects.entries()).map(([proj, ptasks]) => {
                      const projColor = projectColorMap[proj] ?? '#2E75B6';
                      const blockTone = block.includes('3 Month') ? '#FFF2CC' : '#DDEEFF';

                      return (
                        <>
                          {/* Project subheader */}
                          <tr key={`proj-${proj}`} style={{ background: blockTone, cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}
                            onClick={() => toggleProject(proj)}>
                            <td colSpan={4} style={{ padding: '7px 10px 7px 24px', borderLeft: `4px solid ${projColor}` }}>
                              {collapsedProjects.has(proj) ? '▶' : '▼'}
                              <span style={{ marginLeft: 6 }}>{proj}</span>
                            </td>
                            {MONTHS.map(m => <td key={m.label} style={{ borderLeft: '1px solid #dde3ed', background: blockTone }} />)}
                          </tr>

                          {/* Task rows */}
                          {!collapsedProjects.has(proj) && ptasks.map((task, ti) => {
                            const sDate = new Date(task.startDate + 'T00:00:00');
                            const eDate = new Date(task.endDate   + 'T00:00:00');
                            const barLeft  = leftPct(sDate);
                            const barWidth = widthPct(sDate, eDate);
                            const statusCol = STATUS_COLOR[task.status];
                            const rowBg = ti % 2 === 0 ? '#fff' : '#f8fafc';

                            return (
                              <tr key={`${task.id}-${task.task}-${ti}`} style={{ background: rowBg, transition: 'background 0.1s' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#f0f4f8')}
                                onMouseLeave={e => (e.currentTarget.style.background = rowBg)}>
                                <td style={{ padding: '6px 10px 6px 32px', borderBottom: '1px solid #eef2f8' }}>
                                  <div style={{ fontWeight: 500 }}>{task.task}</div>
                                  <div style={{ color: '#888', fontSize: '0.7rem', marginTop: 1 }}>
                                    {fmt(task.startDate)} – {fmt(task.endDate)}
                                    {task.notes && <span style={{ color: '#ED7D31', marginLeft: 4 }}>⚠ {task.notes}</span>}
                                  </div>
                                </td>
                                <td style={{ padding: '6px 10px', borderBottom: '1px solid #eef2f8', color: '#555', whiteSpace: 'nowrap' }}>{task.team}</td>
                                <td style={{ padding: '6px 4px', borderBottom: '1px solid #eef2f8', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.7rem', color: '#555', marginBottom: 2 }}>{task.progress}%</div>
                                  <div style={{ background: '#e0e7ef', borderRadius: 10, height: 5, width: 50, margin: '0 auto' }}>
                                    <div style={{ width: `${task.progress}%`, height: 5, borderRadius: 10, background: statusCol }} />
                                  </div>
                                </td>
                                <td style={{ padding: '6px 4px', borderBottom: '1px solid #eef2f8', textAlign: 'center' }}>
                                  <span style={{
                                    display: 'inline-block', padding: '2px 7px', borderRadius: 10,
                                    fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap',
                                    background: statusCol, color: STATUS_TEXT_COLOR[task.status],
                                  }}>{task.status}</span>
                                </td>

                                {/* Gantt bar cells (one per month column) */}
                                {MONTHS.map((m, mi) => {
                                  const isFirst = mi === 0;
                                  return (
                                    <td key={m.label} style={{ padding: 0, borderBottom: '1px solid #eef2f8', borderLeft: '1px solid #eef2f8', position: 'relative', height: 38 }}>
                                      {isFirst && (
                                        <>
                                          {/* The bar is absolutely positioned across all month cells via negative positioning trick — we render it only in first cell with overflow visible */}
                                          <div style={{
                                            position: 'absolute', top: 9, height: 20, borderRadius: 3,
                                            background: statusCol, opacity: 0.18,
                                            left: `${(barLeft - leftPct(m.start)) * (100 / (100 / MONTHS.length))}%`,
                                            width: `${barWidth * (100 / (100 / MONTHS.length))}%`,
                                            pointerEvents: 'none',
                                          }} />
                                        </>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>

            {/* Today line overlay */}
            {todayLeft !== null && (
              <div style={{
                position: 'absolute', top: 0, bottom: 0, width: 2,
                background: '#C00000', zIndex: 20, pointerEvents: 'none',
                left: `calc(480px + ${(todayLeft / 100).toFixed(6)} * (100% - 480px))`,
              }}>
                <span style={{ position: 'absolute', top: 0, left: 4, fontSize: '0.6rem', color: '#C00000', fontWeight: 700, whiteSpace: 'nowrap' }}>Today</span>
              </div>
            )}
          </div>}

          {/* Legend */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid #eef2f8', background: '#f8fafc', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {(Object.entries(STATUS_COLOR) as [TaskStatus, string][]).map(([s, c]) => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#555' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: c, display: 'inline-block' }} />
                {s}
              </span>
            ))}
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#555' }}>
              <span style={{ width: 2, height: 12, background: '#C00000', display: 'inline-block' }} /> Today
            </span>
          </div>

          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No tasks match the current filters.</p>
          )}
        </div>
      </div>
    </div>
  );
}
