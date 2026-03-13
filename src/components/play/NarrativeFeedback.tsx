"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sendNarrativeFeedback } from "@/lib/feedback";

type Props = {
  storyletId: string;
  dayIndex: number;
};

const DROPDOWNS = [
  {
    key: "historicallyAccurate" as const,
    label: "Historical Accuracy",
    options: [
      { value: "very_accurate", label: "Very Accurate" },
      { value: "mostly_accurate", label: "Mostly Accurate" },
      { value: "somewhat_inaccurate", label: "Somewhat Inaccurate" },
      { value: "not_accurate", label: "Not Accurate" },
    ],
  },
  {
    key: "engagement" as const,
    label: "Engagement",
    options: [
      { value: "very_engaging", label: "Very Engaging" },
      { value: "engaging", label: "Engaging" },
      { value: "neutral", label: "Neutral" },
      { value: "boring", label: "Boring" },
    ],
  },
  {
    key: "emotionalResonance" as const,
    label: "Emotional Resonance",
    options: [
      { value: "strong", label: "Strong" },
      { value: "moderate", label: "Moderate" },
      { value: "weak", label: "Weak" },
      { value: "none", label: "None" },
    ],
  },
  {
    key: "choiceQuality" as const,
    label: "Choice Quality",
    options: [
      { value: "excellent", label: "Excellent" },
      { value: "good", label: "Good" },
      { value: "fair", label: "Fair" },
      { value: "poor", label: "Poor" },
    ],
  },
] as const;

type RatingKeys =
  | "historicallyAccurate"
  | "engagement"
  | "emotionalResonance"
  | "choiceQuality";

export function NarrativeFeedback({ storyletId, dayIndex }: Props) {
  const [open, setOpen] = useState(false);
  const [ratings, setRatings] = useState<Record<RatingKeys, string>>({
    historicallyAccurate: "",
    engagement: "",
    emotionalResonance: "",
    choiceQuality: "",
  });
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const allRated = DROPDOWNS.every((d) => ratings[d.key] !== "");

  const handleSubmit = async () => {
    if (!allRated) return;
    setSending(true);
    try {
      await sendNarrativeFeedback({
        storyletId,
        dayIndex,
        ...ratings,
        comment: comment.trim() || undefined,
      });
      setSent(true);
      setOpen(false);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <p className="text-xs text-slate-500 pl-7">Thanks for the feedback.</p>
    );
  }

  return (
    <div className="space-y-2 pl-7">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
        className="text-xs"
      >
        {open ? "Hide feedback" : "Rate this storylet"}
      </Button>

      {open && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {DROPDOWNS.map((dropdown) => (
              <div key={dropdown.key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {dropdown.label}
                </label>
                <select
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                  value={ratings[dropdown.key]}
                  onChange={(e) =>
                    setRatings((prev) => ({
                      ...prev,
                      [dropdown.key]: e.target.value,
                    }))
                  }
                >
                  <option value="">— select —</option>
                  {dropdown.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Comments (optional)
            </label>
            <textarea
              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Any specific thoughts?"
            />
          </div>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={sending || !allRated}
          >
            {sending ? "Sending..." : "Submit Feedback"}
          </Button>
        </div>
      )}
    </div>
  );
}
