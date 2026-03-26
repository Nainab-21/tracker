'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PlanningData, IssuesData } from '@/lib/types';
import GanttSection from '@/components/GanttSection';
import IssuesSection from '@/components/IssuesSection';

type Tab = 'gantt' | 'issues';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center">
      <p className="text-red-400 font-medium">Failed to load data</p>
      <p className="text-slate-400 text-sm mt-1">{message}</p>
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
      const data = planRes.value;
      if (data.error) setPlanningError(data.detail ?? data.error);
      else setPlanningData(data);
    } else {
      setPlanningError(String(planRes.reason));
    }

    if (issueRes.status === 'fulfilled') {
      const data = issueRes.value;
      if (data.error) setIssuesError(data.detail ?? data.error);
      else setIssuesData(data);
    } else {
      setIssuesError(String(issueRes.reason));
    }

    setLastRefreshed(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-[#0b1120]">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-[#0b1120]/90 backdrop-blur-md">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo + Title */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-400 flex-shrink-0">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white truncate">
                  StomaSense Tracker
                </h1>
                <p className="text-xs text-slate-400">Roadmap &amp; Issues 2026</p>
              </div>
            </div>

            {/* Tabs */}
            <nav className="flex rounded-lg border border-slate-700/50 bg-slate-800/50 p-0.5 gap-0.5">
              {(
                [
                  { id: 'gantt', label: 'Roadmap' },
                  { id: 'issues', label: 'Issues' },
                ] as { id: Tab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Refresh + timestamp */}
            <div className="flex items-center gap-3">
              {lastRefreshed && (
                <span className="text-xs text-slate-500 hidden sm:block">
                  Updated {fmtTime(lastRefreshed)}
                </span>
              )}
              <button
                onClick={() => fetchAll(true)}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:border-blue-500 hover:text-white transition-colors disabled:opacity-50"
              >
                <svg
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <Spinner />
        ) : (
          <>
            {activeTab === 'gantt' && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white">Roadmap 2026</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Interactive Gantt chart — 9 projects across 2 delivery blocks
                  </p>
                </div>
                {planningError ? (
                  <ErrorBanner message={planningError} />
                ) : planningData ? (
                  <GanttSection tasks={planningData.tasks} />
                ) : null}
              </>
            )}

            {activeTab === 'issues' && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white">Issues & Backlog</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Product improvement log — bugs, data issues, features, and enhancements
                  </p>
                </div>
                {issuesError ? (
                  <ErrorBanner message={issuesError} />
                ) : issuesData ? (
                  <IssuesSection issues={issuesData.issues} />
                ) : null}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
