import { Button } from "@/components/ui/button";

const labels = ["Not fun", "Meh", "Okay", "Good", "Great"];
const scaleClasses = [
  "border-purple-200 text-purple-700 hover:bg-purple-50",
  "border-purple-200 text-purple-700 hover:bg-purple-100/70",
  "border-purple-300 text-purple-800 hover:bg-purple-100",
  "border-purple-300 text-purple-800 hover:bg-purple-200/60",
  "border-purple-400 text-purple-900 hover:bg-purple-200",
];

export function FunPulse({
  onSelect,
  onSkip,
  disabled,
}: {
  onSelect: (rating: number) => void;
  onSkip: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">How fun was today?</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
        {labels.map((label, idx) => (
          <Button
            key={label}
            variant="outline"
            onClick={() => onSelect(idx + 1)}
            disabled={disabled}
            className={scaleClasses[idx]}
          >
            {idx + 1} · {label}
          </Button>
        ))}
      </div>
      <Button
        variant="outline"
        onClick={onSkip}
        disabled={disabled}
        className="border-slate-300 text-slate-600 hover:bg-slate-100"
      >
        Skip
      </Button>
    </div>
  );
}
