'use client';

import { useMemo, useState } from 'react';
import type { Issue, IssueGroup } from '@/lib/types';

interface Props {
  issues: Issue[];
}

const GROUP_CONFIG: Record<
  IssueGroup,
  { label: string; color: string; bg: string; border: string }
> = {
  Bug: {
    label: 'Bugs',
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/40',
  },
  'Data Issues': {
    label: 'Data Issues',
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/40',
  },
  'UI/UX': {
    label: 'UI / UX',
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/40',
  },
  'Features & Enhancements': {
    label: 'Features & Enhancements',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/40',
  },
  'Performance & Other': {
    label: 'Performance & Other',
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    border: 'border-green-500/40',
  },
};

const SEVERITY_COLOR: Record<string, string> = {
  Critical: 'bg-red-500 text-white',
  High: 'bg-orange-500 text-white',
  Medium: 'bg-yellow-500 text-black',
  Low: 'bg-slate-500 text-white',
};

const PRIORITY_LABEL: Record<number, string> = {
  1: 'P1 · Critical',
  2: 'P2 · High',
  3: 'P3 · Medium',
  4: 'P4 · Low',
};

function ProgressBar({
  pct,
  color,
  label,
  total,
  done,
}: {
  pct: number;
  color: string;
  label: string;
  total: number;
  done: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-200">{label}</span>
        <span className="text-slate-400">
          {done} / {total} resolved &nbsp;
          <span className="font-semibold text-white">{pct}%</span>
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-slate-700/60 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function IssuesSection({ issues }: Props) {
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Done'>('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [groupFilter, setGroupFilter] = useState<IssueGroup | 'All'>('All');

  const modules = useMemo(
    () => ['All', ...Array.from(new Set(issues.map((i) => i.module).filter(Boolean))).sort()],
    [issues]
  );

  // ── KPI totals ───────────────────────────────────────────────────────────
  const total = issues.length;
  const open = issues.filter((i) => i.status === 'Open').length;
  const done = issues.filter((i) => i.status === 'Done').length;
  const critical = issues.filter(
    (i) => i.status === 'Open' && i.severity === 'Critical'
  ).length;

  // ── Bug progress bar ──────────────────────────────────────────────────────
  const bugs = issues.filter((i) => i.issueGroup === 'Bug');
  const bugsDone = bugs.filter((i) => i.status === 'Done').length;
  const bugsPct = bugs.length ? Math.round((bugsDone / bugs.length) * 100) : 0;

  // ── Data Issues progress bar ──────────────────────────────────────────────
  const dataIssues = issues.filter((i) => i.issueGroup === 'Data Issues');
  const dataIssuesDone = dataIssues.filter((i) => i.status === 'Done').length;
  const dataIssuesPct = dataIssues.length
    ? Math.round((dataIssuesDone / dataIssues.length) * 100)
    : 0;

  // ── Group breakdown ───────────────────────────────────────────────────────
  const groupStats = useMemo(() => {
    const groups = Object.keys(GROUP_CONFIG) as IssueGroup[];
    return groups.map((g) => {
      const all = issues.filter((i) => i.issueGroup === g);
      const openCount = all.filter((i) => i.status === 'Open').length;
      const doneCount = all.filter((i) => i.status === 'Done').length;
      return { group: g, total: all.length, open: openCount, done: doneCount };
    });
  }, [issues]);

  // ── Issue type breakdown (sub-types within each group) ────────────────────
  const typeBreakdown = useMemo(() => {
    const map = new Map<string, { open: number; done: number }>();
    for (const issue of issues) {
      const t = issue.issueType || 'Unknown';
      if (!map.has(t)) map.set(t, { open: 0, done: 0 });
      const entry = map.get(t)!;
      if (issue.status === 'Open') entry.open++;
      else entry.done++;
    }
    return Array.from(map.entries())
      .map(([type, counts]) => ({ type, ...counts, total: counts.open + counts.done }))
      .sort((a, b) => b.total - a.total);
  }, [issues]);

  // ── Filtered table ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (statusFilter !== 'All' && i.status !== statusFilter) return false;
      if (moduleFilter !== 'All' && i.module !== moduleFilter) return false;
      if (groupFilter !== 'All' && i.issueGroup !== groupFilter) return false;
      return true;
    });
  }, [issues, statusFilter, moduleFilter, groupFilter]);

  return (
    <section className="space-y-6">
      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Issues', value: total, sub: 'all time', color: 'text-slate-200' },
          { label: 'Open', value: open, sub: 'need attention', color: 'text-yellow-400' },
          { label: 'Resolved', value: done, sub: 'completed', color: 'text-green-400' },
          { label: 'Open Critical', value: critical, sub: 'highest priority', color: 'text-red-400' },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-4 space-y-1"
          >
            <p className="text-xs text-slate-400 uppercase tracking-wider">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-500">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Progress Bars ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Resolution Progress
        </h3>
        <ProgressBar
          label="Bugs"
          pct={bugsPct}
          color="bg-gradient-to-r from-red-600 to-red-400"
          total={bugs.length}
          done={bugsDone}
        />
        <ProgressBar
          label="Data Issues"
          pct={dataIssuesPct}
          color="bg-gradient-to-r from-orange-600 to-amber-400"
          total={dataIssues.length}
          done={dataIssuesDone}
        />
      </div>

      {/* ── Group Breakdown Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {groupStats.map(({ group, total: t, open: o, done: d }) => {
          const cfg = GROUP_CONFIG[group];
          const pct = t ? Math.round((d / t) * 100) : 0;
          return (
            <div
              key={group}
              className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 space-y-2 cursor-pointer transition-transform hover:scale-[1.02]`}
              onClick={() => setGroupFilter(groupFilter === group ? 'All' : group)}
            >
              <p className={`text-xs font-semibold uppercase tracking-wider ${cfg.color}`}>
                {cfg.label}
              </p>
              <p className="text-2xl font-bold text-white">{t}</p>
              <div className="flex gap-2 text-xs">
                <span className="text-yellow-400">{o} open</span>
                <span className="text-slate-500">·</span>
                <span className="text-green-400">{d} done</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${cfg.color.replace('text-', 'bg-')}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Issue Type Breakdown (sub-types) ──────────────────────────────── */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          Issue Type Breakdown
        </h3>
        <div className="space-y-2">
          {typeBreakdown.map(({ type, total: t, open: o, done: d }) => {
            const pct = t ? Math.round((d / t) * 100) : 0;
            return (
              <div key={type} className="flex items-center gap-3">
                <span className="w-48 text-xs text-slate-300 truncate flex-shrink-0">{type}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-700/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500/70 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-24 text-right flex-shrink-0">
                  {o > 0 ? (
                    <span className="text-yellow-400">{o} open</span>
                  ) : (
                    <span className="text-green-400">all done</span>
                  )}{' '}
                  / {t}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Open' | 'Done')}
          className="rounded-lg border border-slate-600 bg-slate-800 text-slate-200 text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {['All', 'Open', 'Done'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-800 text-slate-200 text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {modules.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>

        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value as IssueGroup | 'All')}
          className="rounded-lg border border-slate-600 bg-slate-800 text-slate-200 text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All Groups</option>
          {(Object.keys(GROUP_CONFIG) as IssueGroup[]).map((g) => (
            <option key={g} value={g}>
              {GROUP_CONFIG[g].label}
            </option>
          ))}
        </select>

        {(statusFilter !== 'All' || moduleFilter !== 'All' || groupFilter !== 'All') && (
          <button
            onClick={() => {
              setStatusFilter('All');
              setModuleFilter('All');
              setGroupFilter('All');
            }}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded border border-slate-600 hover:border-slate-400 transition-colors"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto text-xs text-slate-500 self-center">
          Showing {filtered.length} of {total} issues
        </span>
      </div>

      {/* ── Issues Table ──────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Issue ID</th>
              <th className="px-4 py-3 text-left">Module</th>
              <th className="px-4 py-3 text-left">Component</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">Severity</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left max-w-xs">Description</th>
              <th className="px-4 py-3 text-left">Platform</th>
              <th className="px-4 py-3 text-left">Requester</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {filtered.map((issue) => (
              <tr
                key={`${issue.issueId}-${issue.component}`}
                className="bg-slate-900/40 hover:bg-slate-800/60 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-slate-300 whitespace-nowrap">
                  {issue.issueId}
                </td>
                <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{issue.module}</td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{issue.component}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                      GROUP_CONFIG[issue.issueGroup].bg
                    } ${GROUP_CONFIG[issue.issueGroup].border} ${
                      GROUP_CONFIG[issue.issueGroup].color
                    }`}
                  >
                    {issue.issueType}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                  {PRIORITY_LABEL[issue.priority] ?? `P${issue.priority}`}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      SEVERITY_COLOR[issue.severity] ?? 'bg-slate-600 text-white'
                    }`}
                  >
                    {issue.severity}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      issue.status === 'Open'
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                        : 'bg-green-500/20 text-green-300 border border-green-500/40'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        issue.status === 'Open' ? 'bg-yellow-400' : 'bg-green-400'
                      }`}
                    />
                    {issue.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300 max-w-xs">
                  <p className="line-clamp-2">{issue.description}</p>
                </td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{issue.platform}</td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{issue.requester}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center py-12 text-slate-500">No issues match the current filters.</p>
        )}
      </div>
    </section>
  );
}
