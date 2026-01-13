import { Button } from "@/components/ui/button";

const labels = ["Not fun", "Meh", "Okay", "Good", "Great"];

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
            variant="secondary"
            onClick={() => onSelect(idx + 1)}
            disabled={disabled}
          >
            {idx + 1} · {label}
          </Button>
        ))}
      </div>
      <Button variant="ghost" onClick={onSkip} disabled={disabled}>
        Skip
      </Button>
    </div>
  );
}
