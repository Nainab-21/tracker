'use client';

import { useMemo, useState } from 'react';
import type { PlanningTask, TaskStatus } from '@/lib/types';

interface Props {
  tasks: PlanningTask[];
}

// ── Timeline configuration (March 2026 → October 2026) ───────────────────────
const RANGE_START = new Date('2026-03-01');
const RANGE_END = new Date('2026-11-01');
const TOTAL_MS = RANGE_END.getTime() - RANGE_START.getTime();

const MONTHS = [
  'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026',
  'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026',
];

function barStyle(startDate: string, endDate: string) {
  const s = new Date(startDate).getTime();
  const e = new Date(endDate).getTime();
  const left = Math.max(0, ((s - RANGE_START.getTime()) / TOTAL_MS) * 100);
  const width = Math.max(0.5, ((e - s) / TOTAL_MS) * 100);
  return { left: `${left}%`, width: `${width}%` };
}

function todayStyle() {
  const now = Date.now();
  const pct = ((now - RANGE_START.getTime()) / TOTAL_MS) * 100;
  if (pct < 0 || pct > 100) return null;
  return { left: `${pct}%` };
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  TaskStatus,
  { bar: string; badge: string; dot: string }
> = {
  'In Progress': {
    bar: 'bg-blue-500',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    dot: 'bg-blue-400',
  },
  Pending: {
    bar: 'bg-slate-500',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    dot: 'bg-slate-400',
  },
  Completed: {
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dot: 'bg-emerald-400',
  },
  Blocked: {
    bar: 'bg-red-500',
    badge: 'bg-red-500/20 text-red-300 border-red-500/40',
    dot: 'bg-red-400',
  },
  'Under Review': {
    bar: 'bg-yellow-500',
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    dot: 'bg-yellow-400',
  },
};

// ── Block colors ──────────────────────────────────────────────────────────────
const BLOCK_COLORS: Record<string, string> = {
  '3 Months (Mar-May 2026)': 'bg-amber-500/20 border-l-amber-400',
  'May-Oct 2026': 'bg-blue-500/20 border-l-blue-400',
};

// ── Project palette (10 colors, cycling) ──────────────────────────────────────
const PROJECT_PALETTE = [
  'border-l-cyan-400',
  'border-l-violet-400',
  'border-l-pink-400',
  'border-l-lime-400',
  'border-l-teal-400',
  'border-l-rose-400',
  'border-l-sky-400',
  'border-l-fuchsia-400',
  'border-l-indigo-400',
  'border-l-orange-400',
];

function fmt(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function GanttSection({ tasks }: Props) {
  const [blockFilter, setBlockFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [teamFilter, setTeamFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());

  const blocks = useMemo(
    () => ['All', ...Array.from(new Set(tasks.map((t) => t.block)))],
    [tasks]
  );
  const statuses = useMemo(
    () => ['All', ...Array.from(new Set(tasks.map((t) => t.status)))],
    [tasks]
  );
  const teams = useMemo(
    () => ['All', ...Array.from(new Set(tasks.map((t) => t.team))).sort()],
    [tasks]
  );

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const blocked = tasks.filter((t) => t.status === 'Blocked').length;
  const pending = tasks.filter((t) => t.status === 'Pending').length;
  const globalPct =
    total > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / total) : 0;

  // ── Filtered and grouped tasks ────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tasks.filter((t) => {
      if (blockFilter !== 'All' && t.block !== blockFilter) return false;
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      if (teamFilter !== 'All' && t.team !== teamFilter) return false;
      if (q && !t.task.toLowerCase().includes(q) && !t.project.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [tasks, blockFilter, statusFilter, teamFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, PlanningTask[]>>();
    for (const task of filtered) {
      if (!map.has(task.block)) map.set(task.block, new Map());
      const projects = map.get(task.block)!;
      if (!projects.has(task.project)) projects.set(task.project, []);
      projects.get(task.project)!.push(task);
    }
    return map;
  }, [filtered]);

  // Build a stable project→color index from all tasks
  const projectColorIndex = useMemo(() => {
    const projects = Array.from(new Set(tasks.map((t) => t.project)));
    return Object.fromEntries(projects.map((p, i) => [p, PROJECT_PALETTE[i % PROJECT_PALETTE.length]]));
  }, [tasks]);

  const todayPos = todayStyle();

  const toggleBlock = (b: string) => {
    setCollapsedBlocks((prev) => {
      const next = new Set(prev);
      next.has(b) ? next.delete(b) : next.add(b);
      return next;
    });
  };

  const toggleProject = (p: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  };

  const expandAll = () => {
    setCollapsedBlocks(new Set());
    setCollapsedProjects(new Set());
  };
  const collapseAll = () => {
    setCollapsedBlocks(new Set(grouped.keys()));
  };

  return (
    <section className="space-y-6">
      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: total, color: 'text-slate-200' },
          { label: 'Completed', value: completed, color: 'text-emerald-400' },
          { label: 'In Progress', value: inProgress, color: 'text-blue-400' },
          { label: 'Pending', value: pending, color: 'text-slate-400' },
          { label: 'Blocked', value: blocked, color: 'text-red-400' },
          { label: 'Avg Progress', value: `${globalPct}%`, color: 'text-cyan-400' },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-3 text-center space-y-1"
          >
            <p className="text-xs text-slate-400 uppercase tracking-wider">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Global Progress Bar ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-300 font-medium">Overall Roadmap Progress</span>
          <span className="text-cyan-400 font-bold">{globalPct}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-700/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-700"
            style={{ width: `${globalPct}%` }}
          />
        </div>
      </div>

      {/* ── Filters + Controls ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search tasks or projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-800 text-slate-200 text-sm px-3 py-1.5 w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {[
          { label: 'Block', value: blockFilter, options: blocks, set: setBlockFilter },
          { label: 'Status', value: statusFilter, options: statuses, set: setStatusFilter },
          { label: 'Team', value: teamFilter, options: teams, set: setTeamFilter },
        ].map(({ label, value, options, set }) => (
          <select
            key={label}
            value={value}
            onChange={(e) => set(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800 text-slate-200 text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ))}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={expandAll}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-600 hover:border-slate-400 transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-600 hover:border-slate-400 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* ── Gantt Table ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-700/50 overflow-hidden">
        {/* Header with month labels */}
        <div className="flex bg-slate-900 border-b border-slate-700/50">
          {/* Left info columns */}
          <div className="flex-shrink-0 w-[340px] xl:w-[400px] px-4 py-2 text-xs text-slate-500 uppercase tracking-wider">
            Task
          </div>
          <div className="flex-shrink-0 w-20 px-2 py-2 text-xs text-slate-500 uppercase tracking-wider text-center">
            Progress
          </div>
          <div className="flex-shrink-0 w-24 px-2 py-2 text-xs text-slate-500 uppercase tracking-wider text-center">
            Status
          </div>
          {/* Timeline header */}
          <div className="flex-1 relative overflow-hidden">
            <div className="flex h-full">
              {MONTHS.map((m) => (
                <div
                  key={m}
                  className="flex-1 text-center text-xs text-slate-500 py-2 border-l border-slate-700/40 first:border-l-0"
                >
                  {m}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-700/20">
          {Array.from(grouped.entries()).map(([block, projects]) => {
            const blockCfg = BLOCK_COLORS[block] ?? 'bg-slate-800 border-l-slate-400';
            const isBlockCollapsed = collapsedBlocks.has(block);

            return (
              <div key={block}>
                {/* Block header row */}
                <div
                  className="flex items-center cursor-pointer bg-slate-900/80 hover:bg-slate-900 transition-colors select-none"
                  onClick={() => toggleBlock(block)}
                >
                  <div className="flex-shrink-0 w-[340px] xl:w-[400px] px-4 py-2.5 flex items-center gap-2">
                    <span className="text-slate-400 text-xs">{isBlockCollapsed ? '▶' : '▼'}</span>
                    <span className="text-sm font-semibold text-white">{block}</span>
                    <span className="text-xs text-slate-500">
                      ({projects.size} project{projects.size !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="flex-shrink-0 w-20" />
                  <div className="flex-shrink-0 w-24" />
                  <div className="flex-1 relative h-9">
                    {MONTHS.map((m, idx) => (
                      <div
                        key={m}
                        className="absolute top-0 bottom-0 border-l border-slate-700/20"
                        style={{ left: `${(idx / MONTHS.length) * 100}%` }}
                      />
                    ))}
                    {todayPos && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-red-500/50"
                        style={todayPos}
                      />
                    )}
                  </div>
                </div>

                {!isBlockCollapsed &&
                  Array.from(projects.entries()).map(([project, projectTasks], projIdx) => {
                    const isProjectCollapsed = collapsedProjects.has(project);
                    const projPct =
                      projectTasks.length > 0
                        ? Math.round(
                            projectTasks.reduce((s, t) => s + t.progress, 0) /
                              projectTasks.length
                          )
                        : 0;
                    const projColor = projectColorIndex[project];

                    return (
                      <div key={project}>
                        {/* Project subheader */}
                        <div
                          className={`flex items-center cursor-pointer hover:bg-slate-800/60 transition-colors select-none border-l-2 ${projColor} bg-slate-800/30`}
                          onClick={() => toggleProject(project)}
                        >
                          <div className="flex-shrink-0 w-[340px] xl:w-[400px] px-4 py-2 pl-8 flex items-center gap-2">
                            <span className="text-slate-500 text-xs">
                              {isProjectCollapsed ? '▶' : '▼'}
                            </span>
                            <span className="text-xs font-medium text-slate-200">{project}</span>
                            <span className="text-xs text-slate-500">
                              ({projectTasks.length})
                            </span>
                          </div>
                          <div className="flex-shrink-0 w-20 px-2 text-center">
                            <span className="text-xs text-slate-300">{projPct}%</span>
                          </div>
                          <div className="flex-shrink-0 w-24" />
                          <div className="flex-1 relative h-8">
                            {MONTHS.map((m, idx) => (
                              <div
                                key={m}
                                className="absolute top-0 bottom-0 border-l border-slate-700/20"
                                style={{ left: `${(idx / MONTHS.length) * 100}%` }}
                              />
                            ))}
                            {todayPos && (
                              <div
                                className="absolute top-0 bottom-0 w-px bg-red-500/40"
                                style={todayPos}
                              />
                            )}
                          </div>
                        </div>

                        {/* Task rows */}
                        {!isProjectCollapsed &&
                          projectTasks.map((task) => {
                            const cfg = STATUS_CONFIG[task.status];
                            const style = barStyle(task.startDate, task.endDate);

                            return (
                              <div
                                key={`${task.id}-${task.task}`}
                                className="flex items-center hover:bg-slate-800/40 transition-colors group"
                              >
                                {/* Task info */}
                                <div className="flex-shrink-0 w-[340px] xl:w-[400px] px-4 py-2 pl-12">
                                  <p className="text-xs text-slate-200 font-medium leading-tight">
                                    {task.task}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                                    {task.team} · {fmt(task.startDate)} – {fmt(task.endDate)}
                                    {task.notes && (
                                      <span className="ml-1 text-yellow-500/80">
                                        ⚠ {task.notes}
                                      </span>
                                    )}
                                  </p>
                                </div>

                                {/* Progress */}
                                <div className="flex-shrink-0 w-20 px-2 text-center">
                                  <div className="inline-flex flex-col items-center gap-0.5">
                                    <span className="text-xs font-semibold text-slate-200">
                                      {task.progress}%
                                    </span>
                                    <div className="w-12 h-1 rounded-full bg-slate-700 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${cfg.bar}`}
                                        style={{ width: `${task.progress}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Status badge */}
                                <div className="flex-shrink-0 w-24 px-1 text-center">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${cfg.badge}`}
                                  >
                                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                                    <span className="hidden sm:inline">{task.status}</span>
                                  </span>
                                </div>

                                {/* Timeline bar */}
                                <div className="flex-1 relative h-10 overflow-hidden">
                                  {/* Month grid lines */}
                                  {MONTHS.map((m, idx) => (
                                    <div
                                      key={m}
                                      className="absolute top-0 bottom-0 border-l border-slate-700/20"
                                      style={{ left: `${(idx / MONTHS.length) * 100}%` }}
                                    />
                                  ))}
                                  {/* Today line */}
                                  {todayPos && (
                                    <div
                                      className="absolute top-0 bottom-0 w-px bg-red-500/60 z-10"
                                      style={todayPos}
                                    />
                                  )}
                                  {/* Task bar background */}
                                  <div
                                    className="absolute top-1/2 -translate-y-1/2 h-5 rounded-full bg-slate-600/30 flex items-center overflow-hidden"
                                    style={style}
                                  >
                                    {/* Progress fill */}
                                    <div
                                      className={`h-full rounded-full ${cfg.bar} opacity-80`}
                                      style={{ width: `${task.progress}%` }}
                                    />
                                  </div>
                                  {/* Task label on bar */}
                                  <div
                                    className="absolute top-1/2 -translate-y-1/2 h-5 flex items-center overflow-hidden pointer-events-none"
                                    style={style}
                                  >
                                    <span className="text-[10px] text-white/80 px-1.5 truncate leading-none">
                                      {task.task}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-center py-12 text-slate-500">
            No tasks match the current filters.
          </p>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        {(Object.entries(STATUS_CONFIG) as [TaskStatus, (typeof STATUS_CONFIG)[TaskStatus]][]).map(
          ([status, cfg]) => (
            <span key={status} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
              {status}
            </span>
          )
        )}
        {todayPos && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-px bg-red-500" />
            Today
          </span>
        )}
      </div>
    </section>
  );
}
