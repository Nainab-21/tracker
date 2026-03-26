import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import type { Issue, IssueGroup, IssueStatus } from '@/lib/types';

const SHAREPOINT_URL =
  'https://findabilitysciences-my.sharepoint.com/:x:/p/bnaina/IQCgKaHu8P3YT7JbOk5K_XX8AV9cmMeNa5vIdD8pwc2pogM?e=r7hWlh&download=1';

const DATA_ISSUE_TYPES = new Set([
  'Data Accuracy',
  'Data Availability',
  'Data Configuration',
  'Data Consistency',
  'Data Integration',
  'Data Latency',
  'Data Quality',
  'Data consistency in download',
]);

const UI_TYPES = new Set([
  'UI Consistency',
  'UI Improvement',
  'UI/UX',
  'Usability',
  'Usability Improvement',
  'Visual Consistency',
]);

const FEATURE_TYPES = new Set([
  'New Feature',
  'New Functionality',
  'New Product Request',
  'Enhancement',
  'Improvement',
]);

const PERFORMANCE_TYPES = new Set(['Optimization', 'Performance', 'Restructuring']);

function classifyIssue(issueType: string): IssueGroup {
  if (issueType === 'Bug') return 'Bug';
  if (DATA_ISSUE_TYPES.has(issueType)) return 'Data Issues';
  if (UI_TYPES.has(issueType)) return 'UI/UX';
  if (FEATURE_TYPES.has(issueType)) return 'Features & Enhancements';
  if (PERFORMANCE_TYPES.has(issueType)) return 'Performance & Other';
  return 'Features & Enhancements'; // fallback
}

export async function GET() {
  try {
    const res = await fetch(SHAREPOINT_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
    });

    if (!res.ok) throw new Error(`SharePoint fetch failed: ${res.status}`);

    const buffer = await res.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

    // Find the "Product Improvement Log" sheet (case-insensitive)
    const sheetName =
      wb.SheetNames.find((n) => n.toLowerCase().includes('product improvement')) ??
      wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    const issues: Issue[] = [];

    // Header is row index 2 (0-based), data starts at row index 3
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      if (!row[0]) continue;

      const issueType = String(row[4] ?? '').trim();
      const status = String(row[7] ?? '').trim() as IssueStatus;

      issues.push({
        issueId: String(row[0]).trim(),
        module: String(row[1] ?? '').trim(),
        featureArea: String(row[2] ?? '').trim(),
        component: String(row[3] ?? '').trim(),
        issueType,
        issueGroup: classifyIssue(issueType),
        priority: typeof row[5] === 'number' ? row[5] : Number(row[5]) || 0,
        severity: String(row[6] ?? '').trim(),
        status,
        description: String(row[8] ?? '').trim(),
        progress: typeof row[9] === 'number' ? Math.round(row[9] * 100) : Number(row[9]) || 0,
        dateReported: String(row[10] ?? '').trim(),
        reference: row[11] ? String(row[11]).trim() : null,
        platform: String(row[12] ?? '').trim(),
        tracking: String(row[13] ?? '').trim(),
        requester: String(row[14] ?? '').trim(),
        approval: Boolean(row[15]),
      });
    }

    return NextResponse.json({ issues, lastFetched: new Date().toISOString() });
  } catch (err) {
    console.error('Issues API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch issues data', detail: String(err) },
      { status: 500 }
    );
  }
}
