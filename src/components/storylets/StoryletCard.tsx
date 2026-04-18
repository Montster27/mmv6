import type { Storylet, StoryletChoice } from "@/types/storylets";
import { toChoices } from "@/lib/play";

type Props = {
  storylet: Storylet;
  onSelectChoice?: (choice: StoryletChoice) => void;
  disabled?: boolean;
};

export function StoryletCard({ storylet, onSelectChoice, disabled }: Props) {
  const choices = toChoices(storylet);

  return (
    <div className="rounded border-2 border-primary/20 bg-card px-5 py-5 prep-stripe-top shadow-warm-lg space-y-4">
      <div>
        <p className="prep-label">Preview</p>
        <h3 className="mt-1 font-heading text-xl font-bold text-primary leading-snug">
          {storylet.title}
        </h3>
        <p className="mt-3 font-body text-base leading-relaxed text-foreground/85 whitespace-pre-line max-w-[42rem]">
          {storylet.body}
        </p>
      </div>
      <div className="space-y-3">
        {choices.length > 0 ? (
          choices.map((choice, i) => (
            <div key={choice.id}>
              {i > 0 && <div className="prep-divider my-3" />}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelectChoice?.(choice)}
                className="choice-btn choice-enter"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                {choice.label}
              </button>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-sm italic">No choices available.</p>
        )}
      </div>
    </div>
  );
}
