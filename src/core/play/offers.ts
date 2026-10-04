/**
 * Honest wording for the menu of moments. A scene whose window ends today will not return
 * if the player passes; a scene with days left may. The player should know which is which
 * before they decide, not discover it later.
 */
export type ReturnNote = { text: string; final: boolean };

export function offerReturnNote(expiresOnDay: number, dayIndex: number): ReturnNote {
  if (expiresOnDay <= dayIndex) return { text: "Today only. If you pass, it will not come back.", final: true };
  if (expiresOnDay === dayIndex + 1) return { text: "If you pass, it may still be here tomorrow.", final: false };
  return { text: "If you pass, it may still be here in the next few days.", final: false };
}

/** Pass one offer, or several, without touching the others. */
export function withPassed(passed: ReadonlySet<string>, keys: readonly string[]): Set<string> {
  return new Set([...passed, ...keys]);
}
