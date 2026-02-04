"use client";

import { Button } from "@/components/ui/button";
import { InitiativePanel } from "@/components/play/InitiativePanel";
import type { Faction } from "@/types/factions";

type PublicProfile = {
  user_id: string;
  display_name: string;
};

type ReceivedBoost = {
  from_user_id: string;
  [key: string]: unknown;
};

type Initiative = {
  id: string;
  [key: string]: unknown;
};

type SocialSectionProps = {
  boostMessage: string | null;
  hasSentBoost: boolean;
  publicProfiles: PublicProfile[];
  selectedRecipient: string;
  boostsReceived: ReceivedBoost[];
  loadingSocial: boolean;
  initiatives: Initiative[];
  dayIndex: number;
  directive?: {
    faction_key: string;
    title: string;
    description: string;
    target_type: "initiative" | "arc_unlock" | "signal";
    target_key: string | null;
    week_end_day_index: number;
    status: "active" | "expired" | "completed";
  } | null;
  factions: Faction[];
  initiativeSubmitting: boolean;
  onSendBoost: () => void;
  onRecipientChange: (value: string) => void;
  onContributeInitiative: (id: string) => void;
};

export function SocialSection({
  boostMessage,
  hasSentBoost,
  publicProfiles,
  selectedRecipient,
  boostsReceived,
  loadingSocial,
  initiatives,
  dayIndex,
  directive,
  factions,
  initiativeSubmitting,
  onSendBoost,
  onRecipientChange,
  onContributeInitiative,
}: SocialSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Send a Boost</h2>
      {boostMessage ? (
        <p className="text-sm text-slate-700">{boostMessage}</p>
      ) : null}
      {hasSentBoost ? (
        <p className="text-slate-700">Boost sent for today</p>
      ) : publicProfiles.length === 0 ? (
        <p className="text-slate-700">
          No other players yet. Invite someone and try again.
        </p>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm text-slate-700">
            Choose a player
          </label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
            value={selectedRecipient}
            onChange={(e) => onRecipientChange(e.target.value)}
            disabled={loadingSocial}
          >
            {publicProfiles.map((p) => (
              <option key={p.user_id} value={p.user_id}>
                {p.display_name}
              </option>
            ))}
          </select>
          <Button
            onClick={onSendBoost}
            disabled={!selectedRecipient || loadingSocial}
          >
            {loadingSocial ? "Sending..." : "Send Boost"}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Boosts Received Today</h3>
        {boostsReceived.length === 0 ? (
          <p className="text-sm text-slate-700">
            None yet. Maybe tomorrow.
          </p>
        ) : (
          <ul className="space-y-2">
            {boostsReceived.map((boost, idx) => {
              const sender =
                publicProfiles.find(
                  (p) => p.user_id === boost.from_user_id
                )?.display_name ?? "Unknown player";
              return (
                <li
                  key={`${boost.from_user_id}-${idx}`}
                  className="rounded border border-slate-200 bg-white px-3 py-2 text-slate-800"
                >
                  {sender} sent you a boost.
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {initiatives.length > 0 ? (
        <InitiativePanel
          initiative={initiatives[0]}
          dayIndex={dayIndex}
          directive={directive}
          factions={factions}
          submitting={initiativeSubmitting}
          onContribute={() =>
            onContributeInitiative(initiatives[0].id)
          }
        />
      ) : null}
    </section>
  );
}
