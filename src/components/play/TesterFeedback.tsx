"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sendTesterFeedback } from "@/lib/feedback";

type Props = {
  dayIndex: number;
  context: Record<string, unknown>;
  label?: string;
};

export function TesterFeedback({ dayIndex, context, label = "Leave feedback" }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await sendTesterFeedback({ dayIndex, context, message: message.trim() });
      setSent(true);
      setMessage("");
      setOpen(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={() => setOpen((prev) => !prev)}>
        {label}
      </Button>
      {open ? (
        <div className="space-y-2">
          <textarea
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What felt unclear or off?"
          />
          <Button size="sm" onClick={handleSubmit} disabled={sending}>
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
      ) : null}
      {sent ? <p className="text-xs text-slate-500">Thanks for the note.</p> : null}
    </div>
  );
}
