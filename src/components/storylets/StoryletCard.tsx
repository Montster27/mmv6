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
    <div className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
      <div>
        <p className="text-sm text-slate-600">Preview</p>
        <h3 className="text-lg font-semibold text-slate-900">
          {storylet.title}
        </h3>
        <p className="text-slate-700">{storylet.body}</p>
      </div>
      <div className="space-y-2">
        {choices.length > 0 ? (
          choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectChoice?.(choice)}
              className="w-full justify-start rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed"
            >
              {choice.label}
            </button>
          ))
        ) : (
          <p className="text-slate-600 text-sm">No choices available.</p>
        )}
      </div>
    </div>
  );
}
