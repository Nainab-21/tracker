'use client';

import { useMemo, useState } from 'react';
import type { Issue, IssueGroup } from '@/lib/types';

interface Props { issues: Issue[] }

const GROUP_CONFIG: Record<IssueGroup, { label: string; color: string; icon: string }> = {
  'Issues and Bugs':             { label: 'Issues & Bugs',             color: '#C00000', icon: '🐛' },
  'Current Feature Enhancement': { label: 'Current Feature Enhancement', color: '#2E75B6', icon: '✨' },
  'New Feature/Product Request': { label: 'New Feature / Product Request', color: '#7030A0', icon: '🚀' },
};

const SEVERITY_COLOR: Record<string, { bg: string; text: string }> = {
  Critical: { bg: '#C00000', text: '#fff' },
  High:     { bg: '#ED7D31', text: '#fff' },
  Medium:   { bg: '#FFD966', text: '#1a1a2e' },
  Low:      { bg: '#A6A6A6', text: '#fff' },
};

const PRIORITY_LABEL: Record<number, string> = {
  1: 'P1 · Critical', 2: 'P2 · High', 3: 'P3 · Medium', 4: 'P4 · Low',
};


export default function IssuesSection({ issues }: Props) {
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Done'>('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [groupFilter,  setGroupFilter]  = useState<IssueGroup | 'All'>('All');
  const [search, setSearch] = useState('');

  const modules = useMemo(() =>
    ['All', ...Array.from(new Set(issues.map(i => i.module).filter(Boolean))).sort()],
    [issues]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const total = issues.length;
  const open  = issues.filter(i => i.status === 'Open').length;
  const done  = issues.filter(i => i.status === 'Done').length;

  // ── Resolution progress bars (one per category) ──────────────────────────
  const bugsAll    = issues.filter(i => i.issueGroup === 'Issues and Bugs');
  const bugsDone   = bugsAll.filter(i => i.status === 'Done').length;
  const bugsPct    = bugsAll.length ? Math.round((bugsDone / bugsAll.length) * 100) : 0;

  const enhAll     = issues.filter(i => i.issueGroup === 'Current Feature Enhancement');
  const enhDone    = enhAll.filter(i => i.status === 'Done').length;
  const enhPct     = enhAll.length ? Math.round((enhDone / enhAll.length) * 100) : 0;

  const featAll    = issues.filter(i => i.issueGroup === 'New Feature/Product Request');
  const featDone   = featAll.filter(i => i.status === 'Done').length;
  const featPct    = featAll.length ? Math.round((featDone / featAll.length) * 100) : 0;

  // ── Filtered table ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return issues.filter(i => {
      if (statusFilter !== 'All' && i.status    !== statusFilter) return false;
      if (moduleFilter !== 'All' && i.module    !== moduleFilter) return false;
      if (groupFilter  !== 'All' && i.issueGroup !== groupFilter) return false;
      if (q && !i.description.toLowerCase().includes(q) && !i.issueId.toLowerCase().includes(q) && !i.component.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [issues, statusFilter, moduleFilter, groupFilter, search]);

  const inputStyle: React.CSSProperties = {
    padding: '5px 8px', border: '1px solid #cdd4df', borderRadius: 6,
    fontSize: '0.8rem', background: '#f8fafc', color: '#1a1a2e',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Compact overview + progress ──────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', gap: 24, alignItems: 'center' }}>
        {/* KPI trio */}
        <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
          {([
            { val: total, lbl: 'Total', color: '#2E75B6' },
            { val: open,  lbl: 'Open',  color: '#ED7D31' },
            { val: done,  lbl: 'Resolved', color: '#538135' },
          ] as { val: number; lbl: string; color: string }[]).map(({ val, lbl, color }) => (
            <div key={lbl} style={{ textAlign: 'center', padding: '6px 16px', background: '#F0F4F8', borderRadius: 8, border: '1px solid #dde3ed', minWidth: 72 }}>
              <div style={{ fontSize: '0.68rem', color: '#888', fontWeight: 600, marginBottom: 2 }}>{lbl}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 48, background: '#eef2f8', flexShrink: 0 }} />

        {/* Progress bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { label: 'Issues & Bugs',              pct: bugsPct, total: bugsAll.length, done: bugsDone, color: 'linear-gradient(90deg,#C00000,#ED7D31)' },
            { label: 'Current Feature Enhancement', pct: enhPct,  total: enhAll.length,  done: enhDone,  color: 'linear-gradient(90deg,#2E75B6,#5B9BD5)' },
            { label: 'New Feature / Product Request',pct: featPct, total: featAll.length, done: featDone, color: 'linear-gradient(90deg,#7030A0,#9B59B6)' },
          ].map(({ label, pct, total: t, done: d, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.7rem', color: '#555', fontWeight: 600, width: 220, flexShrink: 0 }}>{label}</span>
              <div style={{ flex: 1, background: '#e0e7ef', borderRadius: 20, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 20, background: color, transition: 'width 0.5s' }} />
              </div>
              <span style={{ fontSize: '0.7rem', color: '#888', whiteSpace: 'nowrap', width: 80, textAlign: 'right', flexShrink: 0 }}>{d}/{t} <strong style={{ color: '#1a1a2e' }}>{pct}%</strong></span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter Bar + Table ───────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {/* Filters */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #eef2f8', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search ID, component, description…"
            style={{ ...inputStyle, width: 240 }} />
          {[
            { label: 'Status', value: statusFilter, set: (v: string) => setStatusFilter(v as 'All'|'Open'|'Done'), opts: ['All', 'Open', 'Done'] },
            { label: 'Module', value: moduleFilter, set: setModuleFilter, opts: modules },
          ].map(({ label, value, set, opts }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.72rem', color: '#888' }}>{label}</span>
              <select value={value} onChange={e => set(e.target.value)} style={inputStyle}>
                {opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.72rem', color: '#888' }}>Category</span>
            <select value={groupFilter} onChange={e => setGroupFilter(e.target.value as IssueGroup | 'All')} style={inputStyle}>
              <option value="All">All</option>
              {(Object.keys(GROUP_CONFIG) as IssueGroup[]).map(g => (
                <option key={g} value={g}>{GROUP_CONFIG[g].icon} {GROUP_CONFIG[g].label}</option>
              ))}
            </select>
          </div>
          {(statusFilter !== 'All' || moduleFilter !== 'All' || groupFilter !== 'All' || search) && (
            <button onClick={() => { setStatusFilter('All'); setModuleFilter('All'); setGroupFilter('All'); setSearch(''); }}
              style={{ padding: '5px 12px', borderRadius: 5, border: '1px solid #cdd4df', background: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
              ↺ Clear
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#888' }}>
            {filtered.length} / {total} issues
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr>
                {['Issue ID','Module','Component','Category','Priority','Severity','Status','Description','Platform','Requester'].map(h => (
                  <th key={h} style={{ background: '#1F3864', color: '#fff', padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap', position: 'sticky', top: 0 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((issue, idx) => {
                const sev    = SEVERITY_COLOR[issue.severity] ?? { bg: '#A6A6A6', text: '#fff' };
                const cfg    = GROUP_CONFIG[issue.issueGroup];
                const isOpen = issue.status === 'Open';
                const rowBg  = idx % 2 === 0 ? '#fff' : '#f8fafc';
                return (
                  <tr key={`${issue.issueId}-${idx}`} style={{ background: rowBg }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f0f4f8')}
                    onMouseLeave={e => (e.currentTarget.style.background = rowBg)}>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #eef2f8', fontFamily: 'monospace', fontSize: '0.72rem', whiteSpace: 'nowrap', color: '#2E75B6', fontWeight: 600 }}>{issue.issueId}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #eef2f8', whiteSpace: 'nowrap' }}>{issue.module}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #eef2f8', color: '#555', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>{issue.component}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #eef2f8', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 10, fontSize: '0.68rem', fontWeight: 600, background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}33` }}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <div style={{ fontSize: '0.65rem', color: '#999', marginTop: 2, paddingLeft: 2 }}>{issue.issueType}</div>
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #eef2f8', fontSize: '0.72rem', color: '#666', whiteSpace: 'nowrap' }}>{PRIORITY_LABEL[issue.priority] ?? `P${issue.priority}`}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #eef2f8', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 10, fontSize: '0.68rem', fontWeight: 700, background: sev.bg, color: sev.text }}>{issue.severity}</span>
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #eef2f8', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: '0.68rem', fontWeight: 700, background: isOpen ? '#FFF2CC' : '#E2EFDA', color: isOpen ? '#7F6000' : '#375623' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOpen ? '#ED7D31' : '#70AD47', display: 'inline-block' }} />
                        {issue.status}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #eef2f8', maxWidth: 300 }}>
                      <div className="line-clamp-2" style={{ color: '#333' }}>{issue.description}</div>
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #eef2f8', color: '#555', whiteSpace: 'nowrap' }}>{issue.platform}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #eef2f8', color: '#555', whiteSpace: 'nowrap' }}>{issue.requester}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No issues match the current filters.</p>
          )}
        </div>
      </div>
    </div>
  );
}
