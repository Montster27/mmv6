# Narrative timing contract

The opening playtests showed three different chronology failures: an arrival scene offered on Day 2, a first-night invitation offered on Day 2, and later dialogue asserting encounters the player never had. The cause is not one bad date. The content uses a broad expiry window both for one-time calendar events and for flexible encounters, while chain overrides can keep pointing at expired scenes. Some sequels lack a causal prerequisite.

## Rules

1. A **fixed event** uses its actual day and segment with `expires_after_days = 0`. If missed, it is missed. A separately authored aftermath or late encounter may appear; the original scene does not move.
2. A **flexible encounter** may have a wider window, but its prose cannot say “first night,” “yesterday,” “tonight,” or imply a prior choice unless that fact is gated.
3. A **causal sequel** lists the storylet or storylets it requires. `requires_storylets` means all listed encounters happened on the same track; `requires_any_storylets` means at least one happened. `excludes_storylets` gives a mutually exclusive fallback. These are hard gates in both offer selection and resolution, including chain overrides.
4. A skipped introduction gets new prose for meeting the person later. Skipping the original offer does not imply that the person or campus ceased to exist.
5. A choice that implies a future promise must have a scheduled fulfillment or breach path. The card-game invitation currently lacks one, so it is rewritten as a possible future invitation rather than recorded as a commitment.

## First-week content audit and replacement

| Content | Classification | Action |
|---|---|---|
| `room_214`, `dorm_hallmates` | Arrival morning | Close after arrival day; add `late_roommate_intro` and `late_hallmates_intro` for Days 2–4 of the displayed run. |
| `lunch_floor`, `evening_choice` | Arrival lunch and first night | Close after arrival day; require the preceding encounter. Add `first_evening_alone` when lunch did not occur. |
| `first_morning`, `morning_after_*` | Next morning | Close after that day; require the relevant opening encounter or choice. |
| `floor_lunch_day2`, `scott_day2_morning` | Named second-day callbacks | Close after their scheduled day and require a prior introduction. |
| `hallway_morning_day3`, `miguel_afternoon_day3` | Named third-day floor callbacks | Close after their scheduled day and require a floor introduction. Remove false “you heard this twice” variants from the first friction beat. |
| `glenn_pastime_paradise`, academic and money opportunities | Flexible | Retain their authored windows. Their future follow-ups remain gated by flags or prior choices. |
| `western_civ_day1`, `reading_or_lounge`, `second_morning_class`, `catch_up_or_coast` | First class and its immediate reading callback | Close on their scheduled days, so a first assignment cannot follow a later class. |
| `roommate_evening_day3` | Third-day roommate evening | Close on that day, require a Scott introduction, and remove the unsupported claim that he left a note yesterday. |
| `tuesday_commitment`, `tuesday_night_*`, `the_post` | Sunday decision and Tuesday appointments | Close on their scheduled days. A Tuesday appointment cannot happen on Wednesday or Thursday. |

The new late introductions are short, repeatable in premise but single-use in the run. They tell the truth about elapsed time and preserve an entry into later roommate and floor situations. The quiet first evening preserves a meaningful path for a player who did not connect with the floor on arrival day. The encounter windows remain deliberately short; future content needs new situations rather than stretching “first” scenes for a week.

## Remaining audit rule

For every future storylet, record whether its time is a calendar event, a delay from a cause, or a flexible window. Content review should reject date-specific prose inside a flexible window and reject callbacks without a recorded prerequisite. The database has older rows whose day labels and prose need this review beyond the opening span; the first-week changes are the concrete repair for the failures observed in the playthroughs.
