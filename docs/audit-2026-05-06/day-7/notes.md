# Day 7 — Walk Notes

## Storylets fired
- **Morning**: SILENT — no content shown
- **Afternoon**: WeeklyCalendar Week 2 surfaced (different trigger from Week 1's Day 3 morning); committed same 4 (Western Civ + Library Study + Hang on the Floor + Free Time)
- **Evening**: Down the Hallway — **Beat 2G `floor_hallway_day6` delayed from Day 6 to Day 7** despite spec saying expires_after_days=0. Single-day window NOT honored by engine. Beat 2F `floor_lounge_tv_day7` did NOT fire (Beat 2G won the evening slot).

## Choices taken
- Beat 2G terminal: "Keep going. The bathroom is at the end of the hall." (Jordan thread seeded)

## §4 findings
- **expires_after_days=0 doesn't actually expire** — engine slid Beat 2G forward to Day 7. The brief said "single-day window — texture beat doesn't need carry-over." Live behavior is more lenient than spec. RED→YELLOW revision: Beat 2G survives, but the data model's expires_after_days=0 semantics don't match design.
- **Beat 2F MISSED on Day 7 evening** — Beat 2G + Hang on the Floor commit consumed the slot; Beat 2F got pushed to Day 8.

## §1 finding
- WeeklyCalendar surfaces TWICE in a 14-day walk (Week 1 → Day 3, Week 2 → Day 7). Multi-week scheduling cadence works.
