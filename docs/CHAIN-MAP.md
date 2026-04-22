# MMV Chain Map

> Live wiring for every active track storylet, regenerated from Supabase on 2026-04-22.
> Source of truth is the DB (`storylets`, `tracks`); this doc is derived.
>
> **Engine model in one line:** the engine now runs a **pool scan per track** inside
> `selectTrackStorylets.ts`. `next_key` on a choice still sets `next_key_override` to
> prioritize explicit chains, but once the override resolves (or is missing), the
> engine scans every eligible storylet on the track and returns the one with the
> earliest expiry. Eligibility checks due-window, `is_active`, preclusion,
> `meetsRequirements` (requires_choice / requires_flag / requires_skill), and the
> segment filter. See `docs/ENGINE-SPEC.md` §1, §2.
>
> **Day numbering:** "Day 0" = player's `started_day` (arrival). "Day N" = `started_day + N`.

---

## Current Chain + Flag State

### ROOMMATE TRACK

```
Day 0 morning   room_214                 → default_next_key: first_morning
Day 1 morning   first_morning            → default_next_key: NULL  (pool takes over)
Day 2 morning   scott_day2_morning       → choice read_note_leave sets_flag: read_scotts_note
Day 3 evening   roommate_evening_day3    → choice go_to_lounge_day3 sets_flag: lounge_day3
Day 8 evening   dana_cereal              → (may set dana_cereal_cold via walk or terminal)
Day 9 evening   dana_letter_surface      [ungated fallback]
Day 9 evening   dana_letter_avoidance    requires_flag: dana_cereal_cold
Day 9 evening   dana_letter_connected    requires_choice: real_question
Day 11 evening  scott_notices            → sets_flag: scott_notices_resolved (either terminal)
Day 14 evening  tuesday_night_dana_movie requires_flag: tuesday_dana_movie
```

**Pool discipline:** Day 9 has three parallel `dana_letter_*` variants — the engine
picks whichever meets its requirements. `dana_letter_surface` is the ungated fallback.

---

### BELONGING TRACK

```
Day 0 morning    dorm_hallmates           → choice next_key: lunch_floor
Day 0 afternoon  lunch_floor              → default_next_key: evening_choice
Day 0 evening    evening_choice           [introduces npc_anderson_bryce]
                                          (choices: go_to_party / go_to_cards / go_to_union)
Day 1 morning    morning_after_party      requires_choice: go_to_party
Day 1 morning    morning_after_cards      requires_choice: go_to_cards  [introduces npc_floor_peterson]
Day 1 morning    morning_after_union      requires_choice: go_to_union
Day 2 afternoon  floor_lunch_day2
Day 3 morning    hallway_morning_day3
Day 3 afternoon  miguel_afternoon_day3
Day 10 afternoon miguel_guitar
Day 11 afternoon priya_dining_hall
Day 12 evening   doug_coach_story
Day 13 evening   tuesday_commitment       (4 walk-flag-gated terminals; each persists its flag)
                   tuesday_decided_study    sets_flag: tuesday_study_group
                   tuesday_decided_terminal sets_flag: tuesday_terminal
                   tuesday_decided_shift    sets_flag: tuesday_shift
                   tuesday_decided_movie    sets_flag: tuesday_dana_movie
Day 14 evening   tuesday_night_study      requires_flag: tuesday_study_group
```

**Preclusion in `evening_choice`:** old `precludes` entries referenced
non-existent slugs (`s_d1_evening_party` etc.). The chain now relies on
`requires_choice` on the Day 1 morning-after variants, which is the correct
pattern — preclusion is no longer needed there.

---

### ACADEMIC TRACK

```
Day 0 morning    admin_errand             → default_next_key: advisor_visit
Day 1 afternoon  advisor_visit
Day 2 morning    western_civ_day1
                   stay_after        sets_flag: checked_syllabus, met_studious_classmate
                   try_to_talk_neighbor sets_flag: met_karen
Day 2 evening    reading_or_lounge
                   do_the_reading   sets_flag: did_reading
                   go_to_lounge     sets_flag: skipped_reading, lounge_day2
Day 3 morning    second_morning_class
Day 3 afternoon  study_group_forming
                   stay_and_review  sets_flag: extra_study
Day 3 evening    catch_up_or_coast        requires_flag: skipped_reading
                   catch_up_now     sets_flag: did_reading_late
Day 8 morning    heller_lecture
```

---

### MONEY TRACK

```
Day 2 afternoon  bookstore_line
                   check_balance     sets_flag: checked_balance
Day 4 evening    money_reality_check
Day 7 afternoon  job_board                (choice outcomes drive has_job_* flags)
Day 10 morning   first_shift_dining       requires_flag: has_job_dining
Day 10 morning   first_shift_grounds      requires_flag: has_job_grounds
Day 10 afternoon first_shift_research     requires_flag: has_job_research
Day 10 evening   first_shift_library      requires_flag: has_job_library
Day 14 evening   tuesday_night_shift      requires_flag: tuesday_shift
```

**Branching model:** `job_board` writes one of four `has_job_*` flags; only the
matching Day 10 shift fires. Same discipline as `tuesday_*` — persistent flags
select from a pool of parallel storylets.

---

### OPPORTUNITY TRACK

```
Day 0 afternoon  glenn_pastime_paradise
                   head_to_evening  sets_flag: glenn_gave_direction
Day 1 afternoon  terminal_first_visit     requires_flag: glenn_gave_direction
                   leave_terminal   sets_flag: found_terminal
Day 5 morning    glenn_the_walk           requires_flag: found_terminal
Day 14 afternoon the_post                 requires_flag: tuesday_terminal
                   log_off_quick    sets_flag: the_post_resolved
                   log_off_shaken   sets_flag: the_post_resolved, delphi_archive_accessed
Day 14 evening   tuesday_night_terminal   requires_flag: tuesday_terminal
```

**Cross-track gate:** `the_post` and `tuesday_night_terminal` are on the
opportunity track but gated on `tuesday_terminal`, which is set by a choice
on the **belonging** track (`tuesday_commitment.tuesday_decided_terminal`).
This only resolves because the engine unions `globalFlags` into each track's
flag set before `meetsRequirements` (see ENGINE-SPEC.md §2 `requirements`).
Prior to 2026-04-22 this gate silently failed.

---

### HOME TRACK

```
Day 7 evening    pay_phone_line   (single storylet; no chain beyond it yet)
```

---

### Disabled / Orphaned

| Slug | Track | Why disabled |
|------|-------|--------------|
| `hall_morning` | belonging | superseded by segment-aware Day 1 morning-after variants |
| `orientation_fair` | belonging | design-stage; not yet wired |
| `cal_midnight_knock` | belonging | design-stage; not yet wired |
| `roommate_moment` | roommate | design-stage; not yet wired |
| `bench_glenn` (pre-rewrite) | belonging | superseded by `glenn_pastime_paradise` on opportunity |
| `s_d1_dorm_roommate` | roommate | superseded by `room_214` |

---

## Cross-Track Flag Index

Flags listed here gate storylets on a track different from the one that sets them.

| Flag | Set by | Gates |
|------|--------|-------|
| `glenn_gave_direction` | opportunity.glenn_pastime_paradise | opportunity.terminal_first_visit (same track, but gate via flag rather than next_key) |
| `found_terminal` | opportunity.terminal_first_visit | opportunity.glenn_the_walk |
| `tuesday_study_group` | belonging.tuesday_commitment | belonging.tuesday_night_study |
| `tuesday_terminal` | belonging.tuesday_commitment | opportunity.the_post, opportunity.tuesday_night_terminal **← cross-track** |
| `tuesday_shift` | belonging.tuesday_commitment | money.tuesday_night_shift **← cross-track** |
| `tuesday_dana_movie` | belonging.tuesday_commitment | roommate.tuesday_night_dana_movie **← cross-track** |
| `has_job_research` / `has_job_library` / `has_job_dining` / `has_job_grounds` | money.job_board | money.first_shift_* |
| `dana_cereal_cold` | roommate.dana_cereal (walk flag → terminal sets_flag) | roommate.dana_letter_avoidance |
| `skipped_reading` / `did_reading` | academic.reading_or_lounge | academic.catch_up_or_coast |

---

## Known Issues

### FLAG 3 — requires_flag is NOT cross-storylet-gate-incapable (RESOLVED 2026-04-22)

~~The track engine has no cross-storylet flag-gate system.~~

Outdated. `selectTrackStorylets.ts → meetsRequirements()` now honours
`requires_choice`, `requires_flag`, and `requires_skill` on `storylet.requirements`.
`requires_flag` is further unioned across all tracks via `globalFlags` in
`dailyLoop.ts`. STORYLINE_MAP-style cross-storylet gates ARE now supported —
at the storylet level, via `sets_flag` on a terminal choice + `requires_flag`
on a downstream storylet.

### FLAG 4 — Due date is relative to started_day (UNCHANGED)

`nextDueDay = progressRow.started_day + nextStorylet.due_offset_days`. A slow
player can land past the dueDay and find storylets already in their expiry
window. Orientation content uses `expires_after_days: 7` to absorb this;
tighter windows (1–3) apply to Week 2 beats where ordering matters.

### FLAG 6 — maxStorylets = 2 (UNCHANGED)

Pool scan still returns at most one candidate per track; across tracks, cap is
2 (configurable, default 2). Segment assignment remains the primary
scheduling tool to avoid starving a track on a given day.

---

*Derived from DB state at 2026-04-22. Regenerate with:*
```sql
SELECT t.key, s.storylet_key, s.order_index, s.due_offset_days, s.expires_after_days,
       s.segment, s.default_next_key, s.requirements
FROM storylets s JOIN tracks t ON t.id = s.track_id
WHERE s.is_active = true ORDER BY t.key, s.due_offset_days, s.order_index;
```
