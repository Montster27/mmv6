/**
 * Single source of truth for narrative feedback form config.
 * Used by both the NarrativeFeedback component and the API route validator.
 */

export const FEEDBACK_DROPDOWNS = [
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

/** Derived type — avoids manual maintenance. */
export type RatingKey = (typeof FEEDBACK_DROPDOWNS)[number]["key"];

/** Derived valid-value Sets for server-side validation. */
export const VALID_RATING_VALUES = Object.fromEntries(
  FEEDBACK_DROPDOWNS.map((d) => [d.key, new Set(d.options.map((o) => o.value))])
) as Record<RatingKey, Set<string>>;
