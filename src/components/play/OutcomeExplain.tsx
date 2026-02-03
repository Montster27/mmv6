"use client";

import type { CheckResult, CheckSkillKey } from "@/types/checks";
import { MessageCard } from "@/components/ux/MessageCard";
import { testerMessage } from "@/lib/messages";

type Props = {
  check: CheckResult;
};

const SKILL_LABELS: Record<CheckSkillKey, string> = {
  focus: "Focus",
  memory: "Memory",
  networking: "Networking",
  grit: "Grit",
};

function formatPercent(value: number) {
  const pct = Math.round(value * 100);
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}

export function OutcomeExplain({ check }: Props) {
  const factors: Array<{ label: string; value: number }> = [];
  (Object.keys(check.contributions.skills) as CheckSkillKey[]).forEach((key) => {
    const value = check.contributions.skills[key];
    if (value !== 0) {
      factors.push({ label: SKILL_LABELS[key], value });
    }
  });
  if (check.contributions.energy !== 0) {
    factors.push({ label: "Energy", value: check.contributions.energy });
  }
  if (check.contributions.stress !== 0) {
    factors.push({ label: "Stress", value: check.contributions.stress });
  }
  if (check.contributions.posture !== 0) {
    factors.push({ label: "Posture", value: check.contributions.posture });
  }

  const topFactors = factors
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 2);
  const chancePct = Math.round(check.chance * 100);
  const details =
    topFactors.length > 0
      ? topFactors
          .map((factor) => `${factor.label} ${formatPercent(factor.value)}`)
          .join(" · ")
      : undefined;
  const message = testerMessage(
    `Chance ${chancePct}% · ${check.success ? "success" : "failure"}`,
    {
      title: "Check breakdown",
      details,
    }
  );

  return <MessageCard message={message} variant="inline" />;
}
