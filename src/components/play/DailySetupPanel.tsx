import { Button } from "@/components/ui/button";
import type {
  DailyPosture,
  DailyTension,
  SkillBank,
  SkillPointAllocation,
} from "@/types/dailyInteraction";

type Props = {
  tensions: DailyTension[];
  skillBank: SkillBank | null;
  posture: DailyPosture | null;
  allocations: SkillPointAllocation[];
  onAllocateSkillPoint: (skillKey: string) => void;
  submitting?: boolean;
};

const SKILLS = ["focus", "memory", "networking", "grit"];

function formatKey(key: string) {
  return key.replace(/_/g, " ");
}

export function DailySetupPanel({
  tensions,
  skillBank,
  posture,
  allocations,
  onAllocateSkillPoint,
  submitting,
}: Props) {
  const activeTensions = tensions.filter((tension) => !tension.resolved_at);
  const points = skillBank?.available_points ?? 0;
  const cap = skillBank?.cap ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Before you plan your day</h2>
        <p className="text-sm text-slate-600">
          A few loose threads still need attention.
        </p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Skill points</h3>
        <p className="text-sm text-slate-700">
          {points} available · cap {cap}
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
            <Button
              key={skill}
              variant="outline"
              disabled={submitting || points <= 0}
              onClick={() => onAllocateSkillPoint(skill)}
              className="capitalize"
            >
              Allocate 1 · {skill}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Posture</h3>
        {posture ? (
          <p className="text-sm text-slate-700 capitalize">{posture.posture}</p>
        ) : (
          <p className="text-sm text-slate-600">Not set yet.</p>
        )}
      </div>

      <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Tensions</h3>
        {activeTensions.length === 0 ? (
          <p className="text-sm text-slate-600">No active tensions.</p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-700">
            {activeTensions.map((tension) => (
              <li key={`${tension.user_id}-${tension.day_index}-${tension.key}`}>
                <span className="font-medium capitalize">{formatKey(tension.key)}</span>
                <span className="text-slate-500"> · severity {tension.severity}</span>
                <span className="text-slate-500">
                  {" "}· expires day {tension.expires_day_index}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
