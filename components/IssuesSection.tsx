'use client';

import { useMemo, useState } from 'react';
import type { Issue, IssueGroup } from '@/lib/types';

interface Props { issues: Issue[] }

const GROUP_CONFIG: Record<IssueGroup, { label: string; color: string }> = {
  'Bug':                    { label: 'Bugs',                  color: '#C00000' },
  'Data Issues':            { label: 'Data Issues',           color: '#ED7D31' },
  'UI/UX':                  { label: 'UI / UX',               color: '#7030A0' },
  'Features & Enhancements':{ label: 'Features & Enhancements', color: '#2E75B6' },
  'Performance & Other':    { label: 'Performance & Other',   color: '#538135' },
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

function KPI({ val, lbl, color }: { val: number | string; lbl: string; color: string }) {
  return (
    <div style={{ background: '#F0F4F8', borderRadius: 8, padding: '10px 8px', textAlign: 'center', border: '1px solid #dde3ed', flex: 1 }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{val}</div>
      <div style={{ fontSize: '0.68rem', color: '#666', marginTop: 2 }}>{lbl}</div>
    </div>
  );
}

function ProgressBar({ label, pct, total, done, color }: { label: string; pct: number; total: number; done: number; color: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#555', marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span>{done} / {total} resolved &nbsp;<strong style={{ color: '#1a1a2e' }}>{pct}%</strong></span>
      </div>
      <div style={{ background: '#e0e7ef', borderRadius: 20, height: 10, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 20, background: color, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

export default function IssuesSection({ issues }: Props) {
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Done'>('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [groupFilter,  setGroupFilter]  = useState<IssueGroup | 'All'>('All');

  const modules = useMemo(() =>
    ['All', ...Array.from(new Set(issues.map(i => i.module).filter(Boolean))).sort()],
    [issues]);

  const total    = issues.length;
  const open     = issues.filter(i => i.status === 'Open').length;
  const done     = issues.filter(i => i.status === 'Done').length;
  const critical = issues.filter(i => i.status === 'Open' && i.severity === 'Critical').length;

  const bugs       = issues.filter(i => i.issueGroup === 'Bug');
  const bugsDone   = bugs.filter(i => i.status === 'Done').length;
  const bugsPct    = bugs.length ? Math.round((bugsDone / bugs.length) * 100) : 0;

  const dataIss     = issues.filter(i => i.issueGroup === 'Data Issues');
  const dataIssDone = dataIss.filter(i => i.status === 'Done').length;
  const dataIssPct  = dataIss.length ? Math.round((dataIssDone / dataIss.length) * 100) : 0;

  const groupStats = useMemo(() =>
    (Object.keys(GROUP_CONFIG) as IssueGroup[]).map(g => {
      const all  = issues.filter(i => i.issueGroup === g);
      const o    = all.filter(i => i.status === 'Open').length;
      const d    = all.filter(i => i.status === 'Done').length;
      return { group: g, total: all.length, open: o, done: d };
    }), [issues]);

  const typeBreakdown = useMemo(() => {
    const map = new Map<string, { open: number; done: number }>();
    for (const issue of issues) {
      const t = issue.issueType || 'Unknown';
      if (!map.has(t)) map.set(t, { open: 0, done: 0 });
      const e = map.get(t)!;
      issue.status === 'Open' ? e.open++ : e.done++;
    }
    return Array.from(map.entries())
      .map(([type, c]) => ({ type, ...c, total: c.open + c.done }))
      .sort((a, b) => b.total - a.total);
  }, [issues]);

  const filtered = useMemo(() => issues.filter(i => {
    if (statusFilter !== 'All' && i.status   !== statusFilter) return false;
    if (moduleFilter !== 'All' && i.module   !== moduleFilter) return false;
    if (groupFilter  !== 'All' && i.issueGroup !== groupFilter) return false;
    return true;
  }), [issues, statusFilter, moduleFilter, groupFilter]);

  const inputStyle: React.CSSProperties = {
    padding: '5px 8px', border: '1px solid #cdd4df', borderRadius: 6,
    fontSize: '0.8rem', background: '#f8fafc', color: '#1a1a2e',
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1,
    color: '#5c7da8', marginBottom: 12, paddingBottom: 4, borderBottom: '1px solid #eef2f8',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={sectionTitle}>📊 Overview</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <KPI val={total}    lbl="Total Issues"   color="#2E75B6" />
          <KPI val={open}     lbl="Open"           color="#ED7D31" />
          <KPI val={done}     lbl="Resolved"       color="#538135" />
          <KPI val={critical} lbl="Open Critical"  color="#C00000" />
        </div>
      </div>

      {/* ── Progress Bars ────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={sectionTitle}>📈 Resolution Progress</div>
        <ProgressBar label="Bugs" pct={bugsPct} total={bugs.length} done={bugsDone}
          color="linear-gradient(90deg, #C00000, #ED7D31)" />
        <ProgressBar label="Data Issues" pct={dataIssPct} total={dataIss.length} done={dataIssDone}
          color="linear-gradient(90deg, #ED7D31, #FFD966)" />
      </div>

      {/* ── Group Breakdown Cards ─────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={sectionTitle}>📂 By Category</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {groupStats.map(({ group, total: t, open: o, done: d }) => {
            const cfg = GROUP_CONFIG[group];
            const p = t ? Math.round((d / t) * 100) : 0;
            const isActive = groupFilter === group;
            return (
              <div key={group} onClick={() => setGroupFilter(isActive ? 'All' : group)}
                style={{
                  flex: '1 1 160px', borderRadius: 8, padding: '12px 14px',
                  border: `2px solid ${isActive ? cfg.color : '#dde3ed'}`,
                  background: isActive ? '#f8fafc' : '#fff',
                  cursor: 'pointer', transition: 'all 0.15s',
                  borderLeft: `5px solid ${cfg.color}`,
                }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cfg.label}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1a1a2e', margin: '4px 0' }}>{t}</div>
                <div style={{ fontSize: '0.7rem', color: '#888' }}>
                  <span style={{ color: '#ED7D31' }}>{o} open</span> · <span style={{ color: '#538135' }}>{d} done</span>
                </div>
                <div style={{ background: '#e0e7ef', borderRadius: 10, height: 5, marginTop: 6 }}>
                  <div style={{ width: `${p}%`, height: 5, borderRadius: 10, background: cfg.color, transition: 'width 0.4s' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Issue Type Breakdown ─────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={sectionTitle}>🔎 Issue Type Breakdown</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {typeBreakdown.map(({ type, total: t, open: o, done: d }) => {
            const p = t ? Math.round((d / t) * 100) : 0;
            return (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 200, fontSize: '0.78rem', color: '#444', flexShrink: 0 }}>{type}</span>
                <div style={{ flex: 1, background: '#e0e7ef', borderRadius: 20, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${p}%`, height: '100%', borderRadius: 20, background: 'linear-gradient(90deg, #2E75B6, #70AD47)', transition: 'width 0.4s' }} />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#888', width: 110, textAlign: 'right', flexShrink: 0 }}>
                  {o > 0
                    ? <span style={{ color: '#ED7D31' }}>{o} open</span>
                    : <span style={{ color: '#538135' }}>all done</span>
                  } / {t}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '12px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: '#555', fontWeight: 600 }}>Filters:</span>
        {[
          { label: 'Status',  value: statusFilter, set: (v: string) => setStatusFilter(v as 'All'|'Open'|'Done'), opts: ['All', 'Open', 'Done'] },
          { label: 'Module',  value: moduleFilter, set: setModuleFilter, opts: modules },
        ].map(({ label, value, set, opts }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: '0.72rem', color: '#888' }}>{label}</label>
            <select value={value} onChange={e => set(e.target.value)} style={inputStyle}>
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: '0.72rem', color: '#888' }}>Group</label>
          <select value={groupFilter} onChange={e => setGroupFilter(e.target.value as IssueGroup | 'All')} style={inputStyle}>
            <option value="All">All Groups</option>
            {(Object.keys(GROUP_CONFIG) as IssueGroup[]).map(g => (
              <option key={g} value={g}>{GROUP_CONFIG[g].label}</option>
            ))}
          </select>
        </div>
        {(statusFilter !== 'All' || moduleFilter !== 'All' || groupFilter !== 'All') && (
          <button onClick={() => { setStatusFilter('All'); setModuleFilter('All'); setGroupFilter('All'); }}
            style={{ padding: '5px 12px', borderRadius: 5, border: '1px solid #cdd4df', background: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
            ↺ Clear
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#888' }}>
          Showing {filtered.length} / {total} issues
        </span>
      </div>

      {/* ── Issues Table ─────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr>
                {['Issue ID','Module','Component','Type','Priority','Severity','Status','Description','Platform','Requester'].map(h => (
                  <th key={h} style={{ background: '#1F3864', color: '#fff', padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap', position: 'sticky', top: 0 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((issue, idx) => {
                const sev = SEVERITY_COLOR[issue.severity] ?? { bg: '#A6A6A6', text: '#fff' };
                const rowBg = idx % 2 === 0 ? '#fff' : '#f8fafc';
                const isOpen = issue.status === 'Open';
                return (
                  <tr key={`${issue.issueId}-${idx}`} style={{ background: rowBg, transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f0f4f8')}
                    onMouseLeave={e => (e.currentTarget.style.background = rowBg)}>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #eef2f8', fontFamily: 'monospace', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{issue.issueId}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #eef2f8', whiteSpace: 'nowrap' }}>{issue.module}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #eef2f8', color: '#555', whiteSpace: 'nowrap' }}>{issue.component}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #eef2f8', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 10, fontSize: '0.68rem', fontWeight: 600, background: `${GROUP_CONFIG[issue.issueGroup].color}22`, color: GROUP_CONFIG[issue.issueGroup].color, border: `1px solid ${GROUP_CONFIG[issue.issueGroup].color}44` }}>
                        {issue.issueType}
                      </span>
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
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #eef2f8', maxWidth: 280 }}>
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
