"use client";

import { memo, useState } from "react";
import {
  ARC_ONE_DOMAINS,
  DOMAIN_LABELS,
  SKILLS_BY_DOMAIN,
  COMPOSITE_SKILLS,
  SKILL_BY_ID,
} from "@/domain/skills/registry";
import type {
  PlayerSkill,
  PlayerComposite,
  SkillDomain,
  BaseSkillDef,
} from "@/types/skillWeb";

type Props = {
  skills: PlayerSkill[];
  composites: PlayerComposite[];
  open: boolean;
  onClose: () => void;
};

function levelPips(level: number, maxLevel = 3) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: maxLevel }, (_, i) => (
        <span
          key={i}
          className={`inline-block h-2 w-2 rounded-full ${
            i < level ? "bg-amber-500" : "bg-slate-200"
          }`}
        />
      ))}
    </span>
  );
}

function progressBar(progress: number, threshold: number) {
  const pct = threshold > 0 ? Math.min(100, (progress / threshold) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded bg-slate-100">
      <div
        className="h-1.5 rounded bg-amber-300 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function prereqsMet(
  def: BaseSkillDef,
  skillMap: Map<string, PlayerSkill>
): boolean {
  return def.prerequisites.every((p) => {
    const ps = skillMap.get(p.skill);
    return ps && ps.level >= p.minLevel;
  });
}

function DomainSection({
  domain,
  skillMap,
  expanded,
  onToggle,
}: {
  domain: SkillDomain;
  skillMap: Map<string, PlayerSkill>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const domainSkills = SKILLS_BY_DOMAIN[domain] ?? [];
  if (domainSkills.length === 0) return null;

  // Count active skills (level > 0 or progress > 0)
  const activeCount = domainSkills.filter((s) => {
    const ps = skillMap.get(s.id);
    return ps && (ps.level > 0 || ps.progress > 0);
  }).length;

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <span>{DOMAIN_LABELS[domain]}</span>
        <span className="flex items-center gap-2 text-xs text-slate-400">
          <span>
            {activeCount}/{domainSkills.length}
          </span>
          <span>{expanded ? "\u25B2" : "\u25BC"}</span>
        </span>
      </button>
      {expanded && (
        <div className="space-y-1 px-3 pb-2">
          {domainSkills.map((def) => {
            const ps = skillMap.get(def.id);
            const level = ps?.level ?? 0;
            const progress = ps?.progress ?? 0;
            const locked =
              def.prerequisites.length > 0 && !prereqsMet(def, skillMap);
            const threshold =
              level < 3 ? def.growthThresholds[level as 0 | 1 | 2] : 0;

            return (
              <div
                key={def.id}
                className={`rounded px-2 py-1.5 ${
                  locked ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">
                    {locked ? "\uD83D\uDD12 " : ""}
                    {def.name}
                  </span>
                  {levelPips(level)}
                </div>
                {!locked && level < 3 && (
                  <div className="mt-0.5">
                    {progressBar(progress, threshold)}
                    <span className="text-[10px] text-slate-400">
                      {progress}/{threshold}
                    </span>
                  </div>
                )}
                {level >= 3 && (
                  <span className="text-[10px] text-amber-600">Proficient</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SkillWebPanelComponent({ skills, composites, open, onClose }: Props) {
  const [expandedDomains, setExpandedDomains] = useState<Set<SkillDomain>>(
    new Set()
  );

  const skillMap = new Map<string, PlayerSkill>();
  for (const s of skills) {
    skillMap.set(s.skill_id, s);
  }

  const compositeMap = new Map<string, number>();
  for (const c of composites) {
    compositeMap.set(c.composite_id, c.level);
  }

  const toggleDomain = (d: SkillDomain) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  if (!open) return null;

  const unlockedComposites = COMPOSITE_SKILLS.filter(
    (c) => (compositeMap.get(c.id) ?? 0) > 0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      {/* Panel */}
      <aside className="relative z-10 mt-16 mr-4 max-h-[calc(100vh-5rem)] w-80 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Skill Web</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {ARC_ONE_DOMAINS.map((domain) => (
            <DomainSection
              key={domain}
              domain={domain}
              skillMap={skillMap}
              expanded={expandedDomains.has(domain)}
              onToggle={() => toggleDomain(domain)}
            />
          ))}
        </div>

        {/* Composites */}
        {unlockedComposites.length > 0 && (
          <div className="border-t border-slate-200 px-3 py-3">
            <p className="mb-2 text-xs font-semibold text-slate-600">
              Composites
            </p>
            <div className="space-y-1">
              {unlockedComposites.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-xs text-slate-600"
                >
                  <span>{c.name}</span>
                  {levelPips(compositeMap.get(c.id) ?? 0)}
                </div>
              ))}
            </div>
          </div>
        )}

        {unlockedComposites.length === 0 && (
          <div className="border-t border-slate-200 px-3 py-3">
            <p className="text-xs text-slate-400">
              Composites emerge when you develop skills across multiple domains.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

export const SkillWebPanel = memo(SkillWebPanelComponent);
