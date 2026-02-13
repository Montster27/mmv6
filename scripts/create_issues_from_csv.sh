#!/usr/bin/env bash
# Create GitHub issues from phase_one_backlog.csv using gh CLI.
# Usage:
#   scripts/create_issues_from_csv.sh           # dry run (prints commands)
#   RUN=1 scripts/create_issues_from_csv.sh     # actually create issues

set -euo pipefail

CSV_PATH="${CSV_PATH:-phase_one_backlog.csv}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found; please install it first." >&2
  exit 1
fi

python3 - <<'PY'
import csv, os, shlex, subprocess
from pathlib import Path

csv_path = Path(os.environ.get("CSV_PATH", "phase_one_backlog.csv"))
if not csv_path.exists():
    raise SystemExit(f"CSV not found: {csv_path}")

with csv_path.open(newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

run = os.environ.get("RUN") == "1"

for row in rows:
    title = row.get("Title", "").strip()
    body = row.get("Body", "").strip()
    labels_raw = row.get("Labels", "")
    milestone = row.get("Milestone", "").strip()

    labels = []
    for chunk in labels_raw.replace(";", ",").split(","):
        label = chunk.strip()
        if label:
            labels.append(label)

    cmd = ["gh", "issue", "create", "--title", title, "--body", body]
    if milestone:
        cmd += ["--milestone", milestone]
    for label in labels:
        cmd += ["--label", label]

    printable = " ".join(shlex.quote(c) for c in cmd)
    if run:
        print(f"Creating: {printable}")
        subprocess.run(cmd, check=True)
    else:
        print(f"[dry-run] {printable}")

print("\nIf you see label errors, create missing labels first, e.g.:")
print("  gh label create \"phase-1\"")
print("  gh label create \"db\"")
print("Use the labels listed in your CSV (semicolon/comma separated).")
PY
