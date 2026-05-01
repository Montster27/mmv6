/**
 * audit-closed-tickets.ts
 *
 * Heuristic disk-vs-ticket audit. For every Kanban Pro ticket in col_done,
 * scans the body for file-path patterns (migrations, playthrough scripts,
 * source files, docs) and reports any references whose target file is
 * missing on disk.
 *
 * Filed to address T-1777215600100. Surfaced after the 2026-04-27 sprint
 * review found that two col_done tickets (T-1777215600001, T-1777215600002,
 * since reopened) referenced files that were never written.
 *
 * Usage:
 *   npx tsx scripts/audit-closed-tickets.ts
 *   npx tsx scripts/audit-closed-tickets.ts --recent 10   # only last N closed
 *
 * Exit code: 0 if no findings, 1 if any missing artifacts surfaced.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";

const TICKETS_DIR = path.resolve(
  process.env.HOME || "",
  "Projects/MMV/_assets/MMV_Docs/Kanban data/tickets",
);
const REPO_ROOT = path.resolve(__dirname, "..");

const PATH_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  {
    name: "migration",
    regex: /\bsupabase\/migrations\/\d{14}_[a-z0-9_]+\.sql\b/g,
  },
  {
    name: "playthrough",
    regex: /\bscripts\/playthroughs\/[a-z0-9_]+\.yaml\b/g,
  },
  {
    name: "source",
    regex: /\bsrc\/[a-zA-Z0-9_\-/.]+\.(ts|tsx)\b/g,
  },
  {
    name: "doc",
    regex: /\bdocs\/[A-Z0-9_\-./]+\.md\b/g,
  },
  {
    name: "scripts",
    regex: /\bscripts\/[a-zA-Z0-9_\-/.]+\.(ts|tsx|sh)\b/g,
  },
];

interface Frontmatter {
  id?: string;
  status?: string;
  modified?: string;
  modifiedBy?: string;
  title?: string;
}

interface TicketScan {
  id: string;
  title: string;
  modified: string;
  modifiedBy: string;
  found: Array<{ pattern: string; ref: string; exists: boolean }>;
}

function parseFrontmatter(content: string): {
  fm: Frontmatter;
  body: string;
} {
  const m = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: content };
  const fmText = m[1];
  const body = m[2];
  const fm: Frontmatter = {};
  for (const line of fmText.split("\n")) {
    const kv = line.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let value = kv[2].trim();
    // Strip wrapping quotes if present
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    if (key === "id" || key === "status" || key === "modified" ||
        key === "modifiedBy" || key === "title") {
      (fm as Record<string, string>)[key] = value;
    }
  }
  return { fm, body };
}

async function scanTicket(filepath: string): Promise<TicketScan | null> {
  const content = await fs.readFile(filepath, "utf-8");
  const { fm, body } = parseFrontmatter(content);

  if (fm.status !== "col_done") return null;

  const found: TicketScan["found"] = [];
  const seen = new Set<string>();

  for (const { name, regex } of PATH_PATTERNS) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(body)) !== null) {
      const ref = match[0];
      const dedupeKey = `${name}::${ref}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const fullPath = path.join(REPO_ROOT, ref);
      let exists = false;
      try {
        await fs.access(fullPath);
        exists = true;
      } catch {
        exists = false;
      }
      found.push({ pattern: name, ref, exists });
    }
  }

  return {
    id: fm.id || path.basename(filepath, ".md"),
    title: fm.title || "(no title)",
    modified: fm.modified || "",
    modifiedBy: fm.modifiedBy || "",
    found,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const recentIdx = args.indexOf("--recent");
  const recentLimit =
    recentIdx >= 0 ? parseInt(args[recentIdx + 1] || "0", 10) : 0;

  const files = await fs.readdir(TICKETS_DIR);
  const ticketFiles = files
    .filter((f) => f.startsWith("T-") && f.endsWith(".md"))
    .map((f) => path.join(TICKETS_DIR, f));

  const scans: TicketScan[] = [];
  for (const fp of ticketFiles) {
    const s = await scanTicket(fp);
    if (s) scans.push(s);
  }

  // Sort by modified DESC; --recent N keeps just the top N
  scans.sort((a, b) => b.modified.localeCompare(a.modified));
  const subset =
    recentLimit > 0 ? scans.slice(0, recentLimit) : scans;

  let totalMissing = 0;
  let totalRefs = 0;
  const stale: TicketScan[] = [];
  for (const s of subset) {
    const missing = s.found.filter((f) => !f.exists);
    totalRefs += s.found.length;
    if (missing.length > 0) {
      totalMissing += missing.length;
      stale.push(s);
    }
  }

  console.log(
    `Scanned ${subset.length} col_done ticket(s). ` +
      `${totalRefs} file reference(s) extracted. ` +
      `${totalMissing} missing artifact(s) across ${stale.length} ticket(s).\n`,
  );

  if (stale.length === 0) {
    console.log("No stale tickets found. ✓");
    process.exit(0);
  }

  console.log("STALE TICKETS:\n");
  for (const s of stale) {
    console.log(`  ${s.id}  ${s.title}`);
    console.log(`    modified: ${s.modified} by ${s.modifiedBy}`);
    for (const ref of s.found.filter((f) => !f.exists)) {
      console.log(`    [${ref.pattern}] MISSING: ${ref.ref}`);
    }
    console.log("");
  }

  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
