import { Button } from "@/components/ui/button";

type Props = {
  dayIndex: number;
  hoursRemaining: number;
  onSleep: () => void;
  onStayUp: () => void;
};

export function SleepCard({ dayIndex, hoursRemaining, onSleep, onStayUp }: Props) {
  const isDone = hoursRemaining <= 0;

  return (
    <div className="rounded border-2 border-primary/15 bg-card px-6 py-6 shadow-warm-lg space-y-4 narrative-enter">
      <p className="prep-label">End of day</p>
      <h3 className="font-heading text-2xl font-bold leading-snug text-primary">
        Day {dayIndex}
      </h3>
      <p className="font-body text-base leading-relaxed text-foreground/80 max-w-[36rem]">
        {isDone
          ? "The day is done. You\u2019ve been awake since morning. Sleep pulls at you."
          : "The night has some time left. You could push through or let the day end."}
      </p>
      <p className="font-stat text-xs text-muted-foreground tabular-nums">
        {hoursRemaining > 0 ? `${hoursRemaining}h remaining` : "No hours remaining"}
      </p>
      <div className="flex flex-wrap gap-3 pt-1">
        <Button onClick={onSleep}>Sleep</Button>
        {!isDone && (
          <Button variant="secondary" onClick={onStayUp}>
            Stay up a little longer
          </Button>
        )}
      </div>
    </div>
  );
}
