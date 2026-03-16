/**
 * Small stat tile used in Content Studio summary panels.
 */
export function Stat({
  label,
  value,
  highlight,
  highlightClass = "text-indigo-600",
}: {
  label: string;
  value: number;
  highlight?: boolean;
  highlightClass?: string;
}) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className={`text-lg font-semibold ${highlight ? highlightClass : "text-slate-800"}`}>
        {value}
      </p>
    </div>
  );
}
