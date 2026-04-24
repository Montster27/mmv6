"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { MiniGameProps } from "@/types/storylets";
import {
  buildDormPhoneRelayRound,
  scoreDormPhoneRelayRound,
  toDormPhoneRelayMiniGameResult,
  type DormPhoneRelayConfig,
  type DormPhoneRelaySelection,
} from "@/lib/minigames/dormPhoneRelay";

type RelayPhase = "briefing" | "reveal" | "deliver" | "summary";

export default function DormPhoneRelayGame({
  onComplete,
  difficulty = 0.5,
  config,
}: MiniGameProps) {
  const relayConfig = (config ?? {}) as DormPhoneRelayConfig;
  const [round] = useState(() => buildDormPhoneRelayRound(difficulty, relayConfig));
  const [phase, setPhase] = useState<RelayPhase>("briefing");
  const [activeCallIndex, setActiveCallIndex] = useState(0);
  const [revealSecondsLeft, setRevealSecondsLeft] = useState(round.revealSeconds);
  const [timeLeft, setTimeLeft] = useState(round.deliverySeconds);
  const [selections, setSelections] = useState<Record<string, DormPhoneRelaySelection>>(
    () =>
      Object.fromEntries(
        round.currentCalls.map((call) => [
          call.id,
          { callId: call.id, residentId: null, message: null },
        ])
      )
  );
  const [selectedCallId, setSelectedCallId] = useState<string>(
    round.currentCalls[0]?.id ?? ""
  );
  const [summary, setSummary] = useState<ReturnType<typeof scoreDormPhoneRelayRound> | null>(
    null
  );
  const [flickerOn, setFlickerOn] = useState(false);
  const completedRef = useRef(false);
  const selectionsRef = useRef(selections);

  useEffect(() => {
    selectionsRef.current = selections;
  }, [selections]);

  const queuedCalls = useMemo(
    () =>
      round.currentCalls.map((call, index) => ({
        ...call,
        queueLabel: `Call ${index + 1}`,
        submitted:
          Boolean(selections[call.id]?.residentId) &&
          Boolean(selections[call.id]?.message),
      })),
    [round.currentCalls, selections]
  );

  const currentCall = round.currentCalls[activeCallIndex] ?? null;

  useEffect(() => {
    if (phase !== "reveal") return;

    setRevealSecondsLeft(round.revealSeconds);
    const interval = window.setInterval(() => {
      setRevealSecondsLeft((previous) => {
        if (previous <= 1) {
          const nextIndex = activeCallIndex + 1;
          if (nextIndex >= round.currentCalls.length) {
            window.clearInterval(interval);
            setPhase("deliver");
            return 0;
          }

          setActiveCallIndex(nextIndex);
          return round.revealSeconds;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activeCallIndex, phase, round.currentCalls.length, round.revealSeconds]);

  useEffect(() => {
    if (phase !== "deliver") return;

    const interval = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          finishRound(true);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (!round.interruptions || phase !== "reveal") return;

    const interval = window.setInterval(() => {
      setFlickerOn((previous) => !previous);
    }, 180);

    return () => window.clearInterval(interval);
  }, [phase, round.interruptions]);

  function finishRound(timedOut: boolean) {
    if (completedRef.current) return;
    completedRef.current = true;

    const nextSummary = scoreDormPhoneRelayRound(
      round,
      Object.values(selectionsRef.current),
      {
        timedOut,
        hooks: relayConfig.hooks,
      }
    );

    setSummary(nextSummary);
    setPhase("summary");
    onComplete(
      toDormPhoneRelayMiniGameResult(
        round,
        nextSummary,
        Object.values(selectionsRef.current)
      )
    );
  }

  function startRound() {
    setPhase("reveal");
    setActiveCallIndex(0);
    setRevealSecondsLeft(round.revealSeconds);
    setTimeLeft(round.deliverySeconds);
  }

  function updateSelection(callId: string, patch: Partial<DormPhoneRelaySelection>) {
    setSelections((previous) => ({
      ...previous,
      [callId]: {
        ...previous[callId],
        ...patch,
      },
    }));
  }

  function submitSelection() {
    const activeSelection = selections[selectedCallId];
    if (!activeSelection?.residentId || !activeSelection?.message) return;

    const remaining = queuedCalls.find(
      (call) =>
        call.id !== selectedCallId &&
        !(
          selections[call.id]?.residentId &&
          selections[call.id]?.message
        )
    );

    if (remaining) {
      setSelectedCallId(remaining.id);
      return;
    }

    finishRound(false);
  }

  const activeSelection = selections[selectedCallId];
  const summaryLines = summary
    ? [
        `${summary.correctDeliveries} delivered cleanly`,
        `${summary.partialMatches} partly remembered`,
        `${summary.wrongRecipients} wrong door`,
        `${summary.wrongMessages} wrong message`,
      ]
    : [];

  return (
    <div className="w-full max-w-[70rem] rounded-2xl border border-[#6f6245] bg-[#16110d] p-3 text-[#f0e6cf] shadow-[0_18px_50px_rgba(0,0,0,0.45)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#4a4030] pb-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-[#d0b36a]">
            Dorm Phone Relay
          </p>
          <p className="text-sm text-[#c9bfa8]">
            Hall phone duty. Remember the caller. Deliver the note to the right door.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-[#5f553f] px-3 py-1">
            Level {round.difficultyLevel}
          </span>
          <span className="rounded-full border border-[#5f553f] px-3 py-1">
            Calls {round.currentCalls.length}
          </span>
          {phase === "deliver" && (
            <span className="rounded-full border border-[#7a6046] px-3 py-1 text-[#ffd38b]">
              {timeLeft}s left
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#584b37] bg-[linear-gradient(180deg,#2c251c_0%,#18120f_100%)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-2xl font-semibold tracking-tight text-[#f7ebcf]">
              Hallway Phone
            </h3>
            {phase === "reveal" && currentCall && (
              <span className="rounded-full border border-[#7b8762] bg-[#1a2416] px-3 py-1 text-base text-[#b9df8a]">
                {revealSecondsLeft}s
              </span>
            )}
          </div>

          <div className="relative min-h-[22rem] overflow-hidden rounded-2xl border border-[#6c5e44] bg-[radial-gradient(circle_at_top,#3d3428_0%,#201914_52%,#130f0c_100%)] p-4 sm:p-5">
            <div className="grid gap-4 md:grid-cols-[7rem_minmax(0,1fr)] md:items-stretch">
              <div className="relative mx-auto h-[16rem] w-24 rounded-[1.8rem] border border-[#8d8062] bg-[linear-gradient(180deg,#d8ccb3_0%,#bba98a_100%)] shadow-[inset_0_0_12px_rgba(85,65,28,0.35)] md:mx-0 md:h-auto md:min-h-[19rem]">
                <div className="absolute left-1/2 top-8 h-16 w-16 -translate-x-1/2 rounded-full border-[7px] border-[#72654b] bg-[#c8b89d]" />
                <div className="absolute left-1/2 top-28 h-24 w-7 -translate-x-1/2 rounded-full bg-[#6c5334]" />
                <div className="absolute bottom-8 left-1/2 h-12 w-20 -translate-x-1/2 rounded-[1.4rem] border border-[#746850] bg-[#cdbd9f]" />
              </div>

              <div
                className={`relative rounded-2xl border px-4 py-4 transition-opacity sm:px-5 sm:py-5 ${
                  flickerOn ? "opacity-65" : "opacity-100"
                }`}
                style={{
                  borderColor: "#655840",
                  background:
                    "linear-gradient(180deg, rgba(30,46,45,0.92) 0%, rgba(15,24,23,0.96) 100%)",
                  boxShadow: "inset 0 0 18px rgba(87, 176, 164, 0.18)",
                }}
              >
                {phase === "briefing" && (
                  <div className="space-y-4">
                    <p className="text-lg leading-relaxed text-[#ebdfc1] sm:text-[1.45rem]">
                      The phone rings in the hall. You get one look at each message, then
                      you have to carry it to the right door before it slips.
                    </p>
                    <ul className="space-y-2 text-base text-[#c9ddcf] sm:text-lg">
                      <li>Memorize caller, resident, and message.</li>
                      <li>Pick a call slip, choose a resident, then the message.</li>
                      <li>Skip is always safe. Failure only matters if you play through.</li>
                    </ul>
                    <button
                      onClick={startRound}
                      className="rounded-xl border border-[#bca163] bg-[#302519] px-5 py-3 text-lg font-semibold text-[#ffe7ae] transition hover:bg-[#3a2d1f]"
                    >
                      Lift Receiver
                    </button>
                  </div>
                )}

                {phase === "reveal" && currentCall && (
                  <div className="space-y-5">
                    <div>
                      <p className="font-mono text-sm uppercase tracking-[0.28em] text-[#8ad7c4]">
                        Incoming Call {activeCallIndex + 1}
                      </p>
                      <p className="mt-3 text-3xl font-semibold text-[#f5edd9]">
                        {currentCall.callerName}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-[#4f7f77] bg-[#16322d] p-4">
                        <p className="text-base uppercase tracking-[0.2em] text-[#8ad7c4]">
                          For
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[#f2e7cb] sm:text-3xl">
                          {currentCall.targetResidentName}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#4f7f77] bg-[#16322d] p-4">
                        <p className="text-base uppercase tracking-[0.2em] text-[#8ad7c4]">
                          Message
                        </p>
                        <p className="mt-2 text-xl leading-snug text-[#f2e7cb] sm:text-2xl">
                          {currentCall.message}
                        </p>
                      </div>
                    </div>
                    <p className="text-base text-[#b6cfc7] sm:text-lg">
                      The line clicks. You have to carry this by memory now.
                    </p>
                  </div>
                )}

                {phase === "deliver" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-sm uppercase tracking-[0.28em] text-[#8ad7c4]">
                        Call Slips
                      </p>
                      <p className="text-sm text-[#b6cfc7] sm:text-base">
                        Finish before the hall settles down.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {queuedCalls.map((call) => {
                        const isActive = call.id === selectedCallId;
                        return (
                          <button
                            key={call.id}
                            onClick={() => setSelectedCallId(call.id)}
                            className={`rounded-xl border px-4 py-3 text-left transition ${
                              isActive
                                ? "border-[#cdb172] bg-[#4a3824] text-[#fff1c7]"
                                : "border-[#5f6b67] bg-[#1b2927] text-[#d6d3c6]"
                            }`}
                          >
                            <p className="text-base font-semibold sm:text-lg">{call.queueLabel}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#b7d6d0] sm:text-sm">
                              {call.submitted ? "Delivered" : "Waiting"}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                    <div className="rounded-xl border border-[#546e67] bg-[#162422] px-4 py-3 text-base text-[#d4ded8] sm:text-lg">
                      Pick the resident and the message you think belong to the highlighted
                      slip.
                    </div>
                  </div>
                )}

                {phase === "summary" && summary && (
                  <div className="space-y-4">
                    <p
                      className={`text-3xl font-semibold ${
                        summary.won ? "text-[#b9f296]" : "text-[#ffb39a]"
                      }`}
                    >
                      {summary.won ? "You kept the floor moving." : "The messages slipped."}
                    </p>
                    <p className="text-xl text-[#eadfc1]">Score {summary.score}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {summaryLines.map((line) => (
                        <div
                          key={line}
                          className="rounded-xl border border-[#5b5344] bg-[#241d17] px-4 py-3 text-base sm:text-lg"
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                    {summary.storyletHookText ? (
                      <p className="rounded-xl border border-[#6a7e6b] bg-[#1a2619] px-4 py-3 text-base text-[#d5efbc] sm:text-lg">
                        {summary.storyletHookText}
                      </p>
                    ) : null}
                    {summary.anomalyText ? (
                      <p className="rounded-xl border border-[#7d6158] bg-[#251918] px-4 py-3 text-base text-[#f3c7bb] sm:text-lg">
                        {summary.anomalyText}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {round.interruptions && phase === "reveal" && flickerOn ? (
              <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_2px,transparent_2px,transparent_8px)]" />
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-[#5d4d37] bg-[linear-gradient(180deg,#271d15_0%,#18110d_100%)] p-4">
          <div className="mb-4 rounded-2xl border border-[#705a3a] bg-[linear-gradient(180deg,#5d4629_0%,#40311f_100%)] p-4">
            <h3 className="text-2xl font-semibold text-[#f7ebcf]">Resident List</h3>
            <p className="mt-1 text-base text-[#e1d2b1]">
              Large labels, quick scan, no second look.
            </p>
          </div>

          <div className="space-y-5 xl:max-h-[40rem] xl:overflow-y-auto xl:pr-2">
            <div>
              <p className="mb-3 font-mono text-sm uppercase tracking-[0.25em] text-[#d2b36d]">
                Choose Resident
              </p>
              <div className="grid gap-2">
                {round.residents.map((resident) => {
                  const isSelected = activeSelection?.residentId === resident.id;
                  return (
                    <button
                      key={resident.id}
                      disabled={phase !== "deliver"}
                      onClick={() =>
                        updateSelection(selectedCallId, { residentId: resident.id })
                      }
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-lg transition sm:text-xl ${
                        isSelected
                          ? "border-[#e0c17d] bg-[#4e3a23] text-[#fff1c8]"
                          : "border-[#66533a] bg-[#221912] text-[#f1e7d2]"
                      } ${phase !== "deliver" ? "opacity-60" : "hover:bg-[#2b2017]"}`}
                    >
                      <span>{resident.name}</span>
                      <span className="font-mono text-base text-[#cfbe95]">
                        {resident.roomLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-3 font-mono text-sm uppercase tracking-[0.25em] text-[#d2b36d]">
                Choose Message
              </p>
              <div className="grid max-h-[18rem] gap-2 overflow-y-auto pr-1">
                {round.messageOptions.map((message) => {
                  const isSelected = activeSelection?.message === message;
                  return (
                    <button
                      key={message}
                      disabled={phase !== "deliver"}
                      onClick={() => updateSelection(selectedCallId, { message })}
                      className={`rounded-xl border px-4 py-3 text-left text-lg leading-snug transition ${
                        isSelected
                          ? "border-[#a5d8cf] bg-[#173430] text-[#eff8f4]"
                          : "border-[#4d5e5a] bg-[#15201e] text-[#dde6e1]"
                      } ${phase !== "deliver" ? "opacity-60" : "hover:bg-[#1c2a27]"}`}
                    >
                      {message}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={submitSelection}
              disabled={
                phase !== "deliver" ||
                !activeSelection?.residentId ||
                !activeSelection?.message
              }
              className="sticky bottom-0 w-full rounded-xl border border-[#d3b36a] bg-[#5a4125] px-5 py-4 text-xl font-semibold text-[#fff1c7] transition hover:bg-[#6a4c2b] disabled:cursor-not-allowed disabled:opacity-50 sm:text-2xl"
            >
              Deliver Message
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
