#!/usr/bin/env node
/**
 * sync-dashboard.js
 *
 * Parses TASKS.md (source of truth) and regenerates the DEFAULT_TASKS
 * array inside dashboard.html. Run after any TASKS.md edit.
 *
 * Usage:  node scripts/sync-dashboard.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TASKS_PATH = path.join(ROOT, 'TASKS.md');
const DASH_PATH = path.join(ROOT, 'dashboard.html');

// ---------------------------------------------------------------------------
// 1. Parse TASKS.md
// ---------------------------------------------------------------------------

function parseTasks(md) {
  const lines = md.split('\n');
  const tasks = [];
  let column = null;   // 'backlog' | 'progress' | 'done'
  let section = '';
  let idCounter = { backlog: 1, progress: 1, done: 1 };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect column headers
    if (/^## Needs Breakdown\b/i.test(line)) { column = 'backlog'; section = 'Needs Breakdown'; continue; }
    if (/^## Backlog\b/i.test(line)) { column = 'backlog'; section = ''; continue; }
    if (/^## In Progress\b/i.test(line)) { column = 'progress'; section = ''; continue; }
    if (/^## Done\b/i.test(line)) { column = 'done'; section = ''; continue; }
    // Stop parsing at milestones/notes
    if (/^## (Milestones|Notes)\b/i.test(line)) { column = null; continue; }
    if (column === null) continue;

    // Section headers (### ...)
    const secMatch = line.match(/^###\s+(.+)/);
    if (secMatch) {
      section = secMatch[1]
        .replace(/\s*\(.*?\)\s*/g, '')   // strip parentheticals like "(Milestone B)"
        .replace(/\s*—.*$/, '')           // strip dash suffixes like "— Engine"
        .trim();
      continue;
    }

    // Task lines: - [ ] **Title** — description `Priority: X` `Category: Y`
    // or:         - [x] **Title** — description `Category: Y`
    const taskMatch = line.match(/^- \[[ x]\]\s+\*\*(.+?)\*\*\s*(?:—\s*(.+))?$/);
    if (!taskMatch) continue;

    const title = taskMatch[1].trim();
    const rest = (taskMatch[2] || '').trim();

    // Extract priority
    let priority = '';
    const priMatch = rest.match(/`Priority:\s*(High|Medium|Low)`/i);
    if (priMatch) priority = priMatch[1].toLowerCase();

    // Extract category
    let category = '';
    const catMatch = rest.match(/`Category:\s*(\w+)`/i);
    if (catMatch) category = catMatch[1];

    // Description is everything before the first backtick tag
    let desc = rest.replace(/\s*`[^`]+`/g, '').trim();

    // Generate stable ID based on column + counter
    const prefix = column === 'backlog' ? 't' : column === 'progress' ? 'p' : 'd';
    const id = prefix + String(idCounter[column]).padStart(2, '0');
    idCounter[column]++;

    tasks.push({
      id,
      section: section || 'General',
      title: truncate(title, 60),
      desc: truncate(desc, 120),
      priority,
      category,
      status: column,
    });
  }

  return tasks;
}

function truncate(s, max) {
  if (!s) return '';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// ---------------------------------------------------------------------------
// 2. Generate JS array
// ---------------------------------------------------------------------------

function tasksToJS(tasks) {
  const lines = tasks.map(t => {
    const fields = [
      `id:${JSON.stringify(t.id)}`,
      `section:${JSON.stringify(t.section)}`,
      `title:${JSON.stringify(t.title)}`,
      `desc:${JSON.stringify(t.desc)}`,
      `priority:${JSON.stringify(t.priority)}`,
      `category:${JSON.stringify(t.category)}`,
      `status:${JSON.stringify(t.status)}`,
    ];
    return `{${fields.join(',')}}`;
  });
  return `var DEFAULT_TASKS=[\n${lines.join(',\n')}\n];`;
}

// ---------------------------------------------------------------------------
// 3. Inject into dashboard.html
// ---------------------------------------------------------------------------

function injectIntoDashboard(dashHtml, jsBlock) {
  // Match from "var DEFAULT_TASKS=[" to the closing "];"
  const pattern = /var DEFAULT_TASKS=\[[\s\S]*?\];/;
  if (!pattern.test(dashHtml)) {
    console.error('ERROR: Could not find DEFAULT_TASKS array in dashboard.html');
    process.exit(1);
  }
  return dashHtml.replace(pattern, jsBlock);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const md = fs.readFileSync(TASKS_PATH, 'utf8');
const tasks = parseTasks(md);

const byStatus = { backlog: 0, progress: 0, done: 0 };
tasks.forEach(t => byStatus[t.status]++);

console.log(`Parsed TASKS.md:`);
console.log(`  Backlog:     ${byStatus.backlog}`);
console.log(`  In Progress: ${byStatus.progress}`);
console.log(`  Done:        ${byStatus.done}`);
console.log(`  Total:       ${tasks.length}`);

const jsBlock = tasksToJS(tasks);
const dashHtml = fs.readFileSync(DASH_PATH, 'utf8');
const updated = injectIntoDashboard(dashHtml, jsBlock);

fs.writeFileSync(DASH_PATH, updated, 'utf8');
console.log(`\nDashboard updated. Open dashboard.html and click "Reset to default" to see changes.`);
