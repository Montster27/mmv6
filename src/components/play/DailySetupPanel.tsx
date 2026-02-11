import { Button } from "@/components/ui/button";
import type {
  DailyPosture,
  DailyTension,
  SkillBank,
  SkillPointAllocation,
} from "@/types/dailyInteraction";
import type { CheckSkillLevels } from "@/types/checks";
import { skillCostForLevel } from "@/core/sim/skillProgression";

type Props = {
  tensions: DailyTension[];
  skillBank: SkillBank | null;
  posture: DailyPosture | null;
  dayIndex: number;
  allocations: SkillPointAllocation[];
  skills?: CheckSkillLevels | null;
  skillsEnabled?: boolean;
  onAllocateSkillPoint: (skillKey: string) => void;
  submitting?: boolean;
  onSubmitPosture: (posture: DailyPosture["posture"]) => void;
  submittingPosture?: boolean;
  actionError?: string | null;
};

const SKILLS = ["focus", "memory", "networking", "grit"];
const POSTURES: DailyPosture["posture"][] = ["push", "steady", "recover", "connect"];

function formatKey(key: string) {
  return key.replace(/_/g, " ");
}

export function DailySetupPanel({
  tensions,
  skillBank,
  posture,
  dayIndex,
  allocations,
  skills,
  skillsEnabled = true,
  onAllocateSkillPoint,
  submitting,
  onSubmitPosture,
  submittingPosture,
  actionError,
}: Props) {
  const activeTensions = tensions.filter((tension) => !tension.resolved_at);
  const points = skillBank?.available_points ?? 0;
  const cap = skillBank?.cap ?? 0;
  const unresolvedCount = activeTensions.length;
  const skillLevels: CheckSkillLevels = {
    focus: skills?.focus ?? 0,
    memory: skills?.memory ?? 0,
    networking: skills?.networking ?? 0,
    grit: skills?.grit ?? 0,
  };
  const getHint = (tension: DailyTension) => {
    const meta = tension.meta as Record<string, unknown> | null;
    return meta && typeof meta.hint === "string" ? meta.hint : null;
  };
  const formatExpires = (tension: DailyTension) => {
    const remaining = tension.expires_day_index - dayIndex;
    if (!Number.isFinite(remaining)) return null;
    if (remaining <= 0) return "expires today";
    return `expires in ${remaining} day${remaining === 1 ? "" : "s"}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Start your day</h2>
        <p className="text-base text-slate-700">
          Set your posture, then plan your time.
        </p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Quick check</h3>
        <ul className="text-sm text-slate-700 space-y-1">
          <li>Posture set: {posture ? "yes" : "no"}</li>
          {skillsEnabled ? <li>Skill points remaining: {points}</li> : null}
          <li>Unresolved tensions: {unresolvedCount}</li>
        </ul>
        {actionError ? (
          <p className="text-xs text-red-600">{actionError}</p>
        ) : null}
      </div>

      {skillsEnabled ? (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-2">
          <h3 className="text-sm font-semibold text-slate-800">
            Skill points (optional)
          </h3>
          <p className="text-sm text-slate-700">
            {points} available · cap {cap}. Spend points to grow skills.
          </p>
          {allocations.length > 0 ? (
            <ul className="text-xs text-slate-600">
              {allocations.map((allocation) => (
                <li
                  key={`${allocation.user_id}-${allocation.day_index}-${allocation.skill_key}`}
                  className="capitalize"
                >
                  {formatKey(allocation.skill_key)} · {allocation.points}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No allocations yet.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {SKILLS.map((skill) => (
              (() => {
                const level = skillLevels[skill as keyof CheckSkillLevels] ?? 0;
                const cost = skillCostForLevel(level + 1);
                return (
                  <Button
                    key={skill}
                    variant="outline"
                    disabled={submitting || points < cost}
                    onClick={() => onAllocateSkillPoint(skill)}
                    className="capitalize"
                  >
                    Spend {cost} · {skill}
                  </Button>
                );
              })()
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">
          Choose a posture for today
        </h3>
        {posture ? (
          <p className="text-sm text-slate-700 capitalize">{posture.posture}</p>
        ) : (
          <p className="text-sm text-slate-600">Not set yet.</p>
        )}
        <p className="text-xs text-slate-500">
          Next step: set your time allocation.
        </p>
        <div className="flex flex-wrap gap-2">
          {POSTURES.map((option) => (
            <Button
              key={option}
              variant={posture?.posture === option ? "default" : "outline"}
              disabled={Boolean(posture) || submittingPosture}
              onClick={() => onSubmitPosture(option)}
              className="capitalize"
            >
              {option}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Open pressures</h3>
        <p className="text-xs text-slate-500">
          Leaving these open will affect tomorrow.
        </p>
        {activeTensions.length === 0 ? (
          <p className="text-sm text-slate-600">No active tensions.</p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-700">
            {activeTensions.map((tension) => (
              <li key={`${tension.user_id}-${tension.day_index}-${tension.key}`}>
                <div className="font-medium capitalize">
                  {formatKey(tension.key)}
                </div>
                <div className="text-xs text-slate-600">
                  Severity {tension.severity}
                </div>
                {getHint(tension) ? (
                  <div className="text-xs text-slate-500">{getHint(tension)}</div>
                ) : null}
                {formatExpires(tension) ? (
                  <div className="text-xs text-slate-500">
                    {formatExpires(tension)}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
