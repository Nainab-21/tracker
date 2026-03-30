/**
 * Saves a snapshot of the current live data as the "previous week" baseline.
 *
 * Usage:
 *   1. Start the dev server: npm run dev
 *   2. In a second terminal: npm run snapshot
 *   3. Commit the updated files: git add snapshots/ && git commit -m "chore: save week snapshot"
 *
 * Or point at a deployed instance:
 *   APP_URL=https://your-app.vercel.app npm run snapshot
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE = process.env.APP_URL ?? 'http://localhost:3000';

async function main() {
  console.log(`Fetching live data from ${BASE} ...`);

  const [planRes, issuesRes] = await Promise.allSettled([
    fetch(`${BASE}/api/planning`).then((r) => r.json()),
    fetch(`${BASE}/api/issues`).then((r) => r.json()),
  ]);

  if (planRes.status === 'rejected')  throw new Error(`Planning fetch failed: ${planRes.reason}`);
  if (issuesRes.status === 'rejected') throw new Error(`Issues fetch failed: ${issuesRes.reason}`);

  const planning = planRes.value;
  const issues   = issuesRes.value;

  if (planning.error) throw new Error(`Planning API error: ${planning.detail ?? planning.error}`);
  if (issues.error)   throw new Error(`Issues API error: ${issues.detail ?? issues.error}`);

  const snapshotDate = new Date().toISOString();
  const snapshotsDir = path.join(ROOT, 'snapshots');
  if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir);

  fs.writeFileSync(
    path.join(snapshotsDir, 'planning.json'),
    JSON.stringify({ ...planning, snapshotDate }, null, 2)
  );
  fs.writeFileSync(
    path.join(snapshotsDir, 'issues.json'),
    JSON.stringify({ ...issues, snapshotDate }, null, 2)
  );

  const d = new Date(snapshotDate);
  const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  console.log(`\n✓ Snapshot saved — ${label}`);
  console.log(`  Planning tasks : ${planning.tasks.length}`);
  console.log(`  Issues         : ${issues.issues.length}`);
  console.log(`\nCommit to preserve:`);
  console.log(`  git add snapshots/ && git commit -m "chore: save week snapshot (${label})"`);
}

main().catch((err) => {
  console.error('\n✗ Snapshot failed:', err.message);
  process.exit(1);
});
