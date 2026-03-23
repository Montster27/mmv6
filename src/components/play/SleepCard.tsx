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
    <div className="rounded border-2 border-primary/20 bg-card px-5 py-5 space-y-4">
      <h3 className="font-heading text-xl font-bold leading-snug text-primary">
        End of Day {dayIndex}
      </h3>
      <p className="text-[15px] leading-relaxed text-foreground/85">
        {isDone
          ? "The day is done. You've been awake since morning. Sleep pulls at you."
          : "The night has some time left. You could push through or let the day end."}
      </p>
      <p className="text-xs text-muted-foreground">
        {hoursRemaining > 0 ? `${hoursRemaining}h remaining` : "No hours remaining"}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onSleep}>Sleep (8h)</Button>
        {!isDone && (
          <Button variant="ghost" onClick={onStayUp}>
            Stay up a little longer
          </Button>
        )}
      </div>
    </div>
  );
}
