'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PlanningData, IssuesData } from '@/lib/types';
import GanttSection from '@/components/GanttSection';
import IssuesSection from '@/components/IssuesSection';

type Tab = 'gantt' | 'issues';

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '4px solid #dde3ed', borderTopColor: '#2E75B6',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      border: '1px solid #f5c6cb', background: '#fff5f5', borderRadius: 8,
      padding: '20px 24px', textAlign: 'center',
    }}>
      <p style={{ color: '#C00000', fontWeight: 600 }}>Failed to load data</p>
      <p style={{ color: '#666', fontSize: '0.85rem', marginTop: 4 }}>{message}</p>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('gantt');
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  const [issuesData, setIssuesData] = useState<IssuesData | null>(null);
  const [planningError, setPlanningError] = useState<string | null>(null);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async (bust = false) => {
    const qs = bust ? `?ts=${Date.now()}` : '';
    setRefreshing(true);
    setPlanningError(null);
    setIssuesError(null);

    const [planRes, issueRes] = await Promise.allSettled([
      fetch(`/api/planning${qs}`).then((r) => r.json()),
      fetch(`/api/issues${qs}`).then((r) => r.json()),
    ]);

    if (planRes.status === 'fulfilled') {
      const d = planRes.value;
      if (d.error) setPlanningError(d.detail ?? d.error);
      else setPlanningData(d);
    } else setPlanningError(String(planRes.reason));

    if (issueRes.status === 'fulfilled') {
      const d = issueRes.value;
      if (d.error) setIssuesError(d.detail ?? d.error);
      else setIssuesData(d);
    } else setIssuesError(String(issueRes.reason));

    setLastRefreshed(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1F3864 0%, #2E75B6 100%)',
        color: '#fff', padding: '18px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 3px 10px rgba(0,0,0,0.25)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.5px' }}>
            🌿 StomaSense – Roadmap &amp; Product Improvement Log Tracker
          </h1>
          <div style={{ fontSize: '0.78rem', opacity: 0.8, marginTop: 4 }}>
            Blocks: [3 Months Mar–May 2026] · [May–Oct 2026] · Last updated: {lastRefreshed?.toLocaleTimeString() ?? '—'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 3, gap: 3 }}>
            {(['gantt', 'issues'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 18px', borderRadius: 6, border: 'none',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                  background: activeTab === tab ? '#fff' : 'transparent',
                  color: activeTab === tab ? '#1F3864' : '#fff',
                  transition: 'all 0.2s',
                }}
              >
                {tab === 'gantt' ? '📊 Roadmap' : '📋 Product Improvement Log'}
              </button>
            ))}
          </div>

          {/* Today badge */}
          <div style={{
            background: '#FFD966', color: '#1a1a2e', borderRadius: 20,
            padding: '5px 14px', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            📅 {todayStr}
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            style={{
              padding: '6px 16px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.1)', color: '#fff',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              fontSize: '0.82rem', fontWeight: 600,
              opacity: refreshing ? 0.6 : 1, transition: 'background 0.2s',
            }}
          >
            {refreshing ? '↺ Refreshing…' : '↺ Refresh'}
          </button>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 24px' }}>
        {loading ? (
          <Spinner />
        ) : (
          <>
            {activeTab === 'gantt' && (
              planningError
                ? <ErrorBanner message={planningError} />
                : planningData
                  ? <GanttSection tasks={planningData.tasks} />
                  : null
            )}
            {activeTab === 'issues' && (
              issuesError
                ? <ErrorBanner message={issuesError} />
                : issuesData
                  ? <IssuesSection issues={issuesData.issues} />
                  : null
            )}
          </>
        )}
      </div>
    </div>
  );
}
