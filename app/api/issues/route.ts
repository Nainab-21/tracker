import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import type { Issue, IssueGroup, IssueStatus } from '@/lib/types';

const ISSUES_AND_BUGS = new Set([
  'Bug',
  'Data Accuracy', 'Data Availability', 'Data Configuration',
  'Data Consistency', 'Data Integration', 'Data Latency',
  'Data Quality', 'Data consistency in download',
  'Performance', 'UI Consistency', 'Visual Consistency',
]);

const NEW_FEATURE_TYPES = new Set([
  'New Feature', 'New Functionality', 'New Product Request',
]);

function classifyIssue(issueType: string): IssueGroup {
  if (ISSUES_AND_BUGS.has(issueType))   return 'Issues and Bugs';
  if (NEW_FEATURE_TYPES.has(issueType)) return 'New Feature/Product Request';
  return 'Current Feature Enhancement'; // Enhancement, Improvement, Optimization, UI/UX, Usability, Restructuring, etc.
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'app_issues_backlog.xlsx');
    const buffer = fs.readFileSync(filePath);
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });

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
      // col 5 = Category (new); cols 6+ shifted by 1 vs old layout
      const status = String(row[8] ?? '').trim() as IssueStatus;

      issues.push({
        issueId: String(row[0]).trim(),
        module: String(row[1] ?? '').trim(),
        featureArea: String(row[2] ?? '').trim(),
        component: String(row[3] ?? '').trim(),
        issueType,
        issueGroup: classifyIssue(issueType),
        priority: typeof row[6] === 'number' ? row[6] : Number(row[6]) || 0,
        severity: String(row[7] ?? '').trim(),
        status,
        description: String(row[9] ?? '').trim(),
        progress: typeof row[10] === 'number' ? Math.round(row[10] * 100) : Number(row[10]) || 0,
        dateReported: String(row[11] ?? '').trim(),
        reference: row[12] ? String(row[12]).trim() : null,
        platform: String(row[13] ?? '').trim(),
        tracking: String(row[14] ?? '').trim(),
        requester: String(row[15] ?? '').trim(),
        approval: Boolean(row[16]),
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
