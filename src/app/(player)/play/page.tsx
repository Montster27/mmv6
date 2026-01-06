"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { ensurePlayerSetup } from "@/lib/bootstrap";
import { ensureCadenceUpToDate } from "@/lib/cadence";
import {
  createStoryletRun,
  fetchDailyState,
  fetchTimeAllocation,
  fetchTodayRuns,
  fetchTodayStoryletCandidates,
  markDailyComplete,
  saveTimeAllocation,
  type DailyState,
  type StoryletListItem,
  type StoryletRun,
  type TimeAllocation,
} from "@/lib/play";
import {
  fetchPublicProfiles,
  fetchTodayReceivedBoosts,
  hasSentBoostToday,
  sendBoost,
  type PublicProfile,
  type ReceivedBoost,
} from "@/lib/social";
import { AuthGate } from "@/ui/components/AuthGate";

const defaultAllocation: TimeAllocation = {
  study: 0,
  work: 0,
  social: 0,
  health: 0,
  fun: 0,
};

export default function PlayPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [dailyState, setDailyState] = useState<DailyState | null>(null);
  const [allocation, setAllocation] =
    useState<TimeAllocation>(defaultAllocation);
  const [allocationSaved, setAllocationSaved] = useState(false);
  const [storylets, setStorylets] = useState<StoryletListItem[]>([]);
  const [runs, setRuns] = useState<StoryletRun[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingAllocation, setSavingAllocation] = useState(false);
  const [savingChoice, setSavingChoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicProfiles, setPublicProfiles] = useState<PublicProfile[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string>("");
  const [boostsReceived, setBoostsReceived] = useState<ReceivedBoost[]>([]);
  const [hasSentBoost, setHasSentBoost] = useState(false);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [alreadyCompletedToday, setAlreadyCompletedToday] = useState(false);
  const [dayIndexState, setDayIndexState] = useState(1);

  const dayIndex = useMemo(
    () => dailyState?.day_index ?? dayIndexState,
    [dailyState?.day_index, dayIndexState]
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const { userId } = await ensurePlayerSetup();
        setUserId(userId);

        const cadence = await ensureCadenceUpToDate(userId);
        setDayIndexState(cadence.dayIndex);
        setAlreadyCompletedToday(cadence.alreadyCompletedToday);

        const ds = await fetchDailyState(userId);
        if (ds) {
          setDailyState({ ...ds, day_index: cadence.dayIndex });
        }
        const day = cadence.dayIndex;

        const existingAllocation = await fetchTimeAllocation(userId, day);
        if (existingAllocation) {
          setAllocation({ ...defaultAllocation, ...existingAllocation });
          setAllocationSaved(true);
        }

        const existingRuns = await fetchTodayRuns(userId, day);
        setRuns(existingRuns);

        const candidates = await fetchTodayStoryletCandidates();
        const used = new Set(existingRuns.map((r) => r.storylet_id));
        const next = candidates
          .filter((c) => !used.has(c.id))
          .slice(0, 2);
        setStorylets(next);

        const [profiles, received, sent] = await Promise.all([
          fetchPublicProfiles(userId),
          fetchTodayReceivedBoosts(userId, day),
          hasSentBoostToday(userId, day),
        ]);
        setPublicProfiles(profiles);
        setSelectedRecipient(profiles[0]?.user_id ?? "");
        setBoostsReceived(received);
        setHasSentBoost(sent);
      } catch (e) {
        console.error(e);
        setError("Failed to load play state.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const totalAllocation = useMemo(
    () =>
      Object.values(allocation).reduce(
        (sum, value) => sum + (Number.isFinite(value) ? Number(value) : 0),
        0
      ),
    [allocation]
  );

  const allocationValid = totalAllocation === 100;

  const handleAllocationChange = (key: keyof TimeAllocation, value: number) => {
    setAllocation((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveAllocation = async () => {
    if (!userId || !allocationValid) return;
    setSavingAllocation(true);
    setError(null);
    try {
      await saveTimeAllocation(userId, dayIndex, allocation);
      setAllocationSaved(true);
    } catch (e) {
      console.error(e);
      setError("Failed to save allocation.");
    } finally {
      setSavingAllocation(false);
    }
  };

  const currentStorylet = storylets[currentIndex];

  const handleChoice = async (choiceId: string) => {
    if (!userId || !currentStorylet) return;
    setSavingChoice(true);
    setError(null);
    try {
      await createStoryletRun(userId, currentStorylet.id, dayIndex, choiceId);
      setRuns((prev) => [
        ...prev,
        { id: `${currentStorylet.id}-${choiceId}-${Date.now()}`, storylet_id: currentStorylet.id, choice_id: choiceId },
      ]);
      setCurrentIndex((i) => i + 1);
    } catch (e) {
      console.error(e);
      setError("Failed to record choice.");
    } finally {
      setSavingChoice(false);
    }
  };

  const loadSocialData = async (uid: string, day: number) => {
    setLoadingSocial(true);
    const [profiles, received, sent] = await Promise.all([
      fetchPublicProfiles(uid),
      fetchTodayReceivedBoosts(uid, day),
      hasSentBoostToday(uid, day),
    ]);
    setPublicProfiles(profiles);
    setSelectedRecipient((prev) => prev || profiles[0]?.user_id || "");
    setBoostsReceived(received);
    setHasSentBoost(sent);
    setLoadingSocial(false);
  };

  const handleSendBoost = async () => {
    if (!userId || !selectedRecipient) return;
    setError(null);
    setLoadingSocial(true);
    try {
      await sendBoost(userId, selectedRecipient, dayIndex);
      await loadSocialData(userId, dayIndex);
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : "Failed to send boost. Try again."
      );
    } finally {
      setLoadingSocial(false);
    }
  };

  const completionReached = allocationSaved && !currentStorylet;

  useEffect(() => {
    const markCompleteIfNeeded = async () => {
      if (!userId) return;
      if (!completionReached) return;
      if (alreadyCompletedToday) return;
      try {
        await markDailyComplete(userId, dayIndex);
      } catch (e) {
        console.error("Failed to mark daily complete", e);
      }
    };
    markCompleteIfNeeded();
  }, [completionReached, alreadyCompletedToday, userId, dayIndex]);

  return (
    <AuthGate>
      {(session) => (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Play</h1>
              <p className="text-slate-700">
                Day {dayIndex} · Energy {dailyState?.energy ?? "—"} · Stress{" "}
                {dailyState?.stress ?? "—"}
              </p>
              <p className="text-slate-600 text-sm">
                Signed in as {session.user.email ?? "unknown user"}.
              </p>
            </div>
            <Button onClick={signOut}>Sign out</Button>
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <p className="text-slate-700">Loading…</p>
          ) : alreadyCompletedToday && !completionReached ? (
            <>
              <section className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
                <h2 className="text-xl font-semibold">Daily complete ✅</h2>
                <p className="text-slate-700">Come back tomorrow.</p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold">Boosts Received Today</h2>
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
              </section>
            </>
          ) : (
            <>
              {!allocationSaved && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Step 1: Time Allocation</h2>
                    <span className="text-sm text-slate-600">
                      Total must equal 100 (current: {totalAllocation})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.keys(allocation).map((key) => (
                      <label
                        key={key}
                        className="flex flex-col gap-1 text-sm text-slate-700"
                      >
                        <span className="capitalize">{key}</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
                          value={allocation[key as keyof TimeAllocation]}
                          onChange={(e) =>
                            handleAllocationChange(
                              key as keyof TimeAllocation,
                              Number(e.target.value)
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <Button
                    onClick={handleSaveAllocation}
                    disabled={!allocationValid || savingAllocation}
                  >
                    {savingAllocation ? "Saving..." : "Save allocation"}
                  </Button>
                </section>
              )}

              {allocationSaved && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Step 2: Storylets</h2>
                    <span className="text-sm text-slate-600">
                      Progress: {Math.min(currentIndex, 2)}/2
                    </span>
                  </div>

                  {!currentStorylet ? (
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-3">
                      {storylets.length === 0 ? (
                        <p className="text-slate-700">
                          No more storylets today.
                        </p>
                      ) : (
                        <p className="text-slate-700">Daily complete ✅</p>
                      )}
                      <Button className="mt-3" variant="secondary">
                        Back tomorrow
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
                      <div>
                        <p className="text-sm text-slate-600">
                          Storylet {currentIndex + 1} of{" "}
                          {Math.min(2, storylets.length)}
                        </p>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {currentStorylet.title}
                        </h3>
                        <p className="text-slate-700">{currentStorylet.body}</p>
                      </div>
                      <div className="space-y-2">
                        {(() => {
                          const choices =
                            typeof currentStorylet.choices === "string"
                              ? (() => {
                                  try {
                                    return JSON.parse(currentStorylet.choices);
                                  } catch {
                                    return [];
                                  }
                                })()
                              : currentStorylet.choices || [];

                          return choices.length > 0 ? (
                            choices.map((choice: any) => (
                              <Button
                                key={choice.id}
                                variant="secondary"
                                disabled={savingChoice}
                                onClick={() => handleChoice(choice.id)}
                                className="w-full justify-start"
                              >
                                {choice.label}
                              </Button>
                            ))
                          ) : (
                            <p className="text-slate-600 text-sm">
                              No choices available.
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {completionReached && (
                <section className="space-y-3">
                  <h2 className="text-xl font-semibold">Send a Boost</h2>
                  {hasSentBoost ? (
                    <p className="text-slate-700">Boost sent for today ✅</p>
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
                        onChange={(e) => setSelectedRecipient(e.target.value)}
                        disabled={loadingSocial}
                      >
                        {publicProfiles.map((p) => (
                          <option key={p.user_id} value={p.user_id}>
                            {p.display_name}
                          </option>
                        ))}
                      </select>
                      <Button
                        onClick={handleSendBoost}
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
                </section>
              )}
            </>
          )}
        </div>
      )}
    </AuthGate>
  );
}
