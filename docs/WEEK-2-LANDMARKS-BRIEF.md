<!-- /docs/WEEK-2-LANDMARKS-BRIEF.md -->
<!-- ///////////////////////////////////////////// -->
<!-- FRAGMENT — not a complete standalone document -->
<!-- Intended for: docs/ folder in MMV repo       -->
<!-- ///////////////////////////////////////////// -->

# Week 2 Landmarks Brief — Arc One, Days 8–14

> **⚠️ Status note (added 2026-04-24):** When this brief was drafted, the
> author was working from outdated context. The five Week 2 landmarks are
> **already built and shipped** — see Kanban ticket T-1776329281009. Specifically:
>
> - L1 (`job_board`) ships with variants **library / dining / grounds / research**
>   — NOT the library/work-study/diner set in this brief.
> - L2 ships as `scott_notices` (Day 11 evening crystallizer) — not `s_w2_scotts_thing`.
> - L3 ships as `first_shift_{dining,grounds,research,library}` — not work-study/diner.
> - L4 ships as `tuesday_commitment` (Day 13 evening, 4 terminals) — see T-1776874028589.
> - L5 ships as `the_post` (Day 14 afternoon) — see T-1776874028589 globalFlags union.
>
> **What this brief is for:**
> 1. **Prose alternative.** The L1–L5 prose drafts in this document are an
>    alternative reading of each scene — different variant set, different day
>    numbering (Mon–Sun Days 8–14 vs the built Day 7–14 calendar), different
>    NPC anchors (Wallace's Diner / Mrs. Pettit / Lenore vs the built Dining/
>    Grounds/Research roster). Use as creative input for revision passes, not
>    as a build spec.
> 2. **Design rationale.** The collision calendar, miss paths, prose-craft
>    notes, and editorial checklist are still useful for the remaining
>    acceptance criteria on T-1776329281009: canonical playthrough scripts
>    and node-usage review.
> 3. **Open questions (§7).** The five questions at the end are still live —
>    period friction sprint scope, Anderson party as separate landmark, KESTREL
>    reply branches, Hal hook, staff NPC schema. Worth resolving in the next
>    sprint planning pass regardless of the prose-vs-built mismatch.
>
> **Do not hand this brief to Code as a build spec without first reconciling
> it against the live storylets.** A clean reconciliation pass would either
> (a) keep the built variants and use this doc only for editorial revision,
> or (b) deliberately retire the built variants and rebuild against this
> brief — which would be a big change and should be its own ticket if so.
>
> Original brief content follows below, unchanged.

---

> **Purpose:** Production spec for Code to build the five Week 2 landmarks
> without design questions. All structural decisions are locked. Prose is
> draft-quality and may be edited by the editorial pass before insert.
>
> **Sprint deadline:** Apr 28
>
> **Contents:** Calendar shape · Collision calendar · 5 landmarks (L1–L5) ·
> Miss paths · Implementation notes for Code
>
> **Note:** This brief covers the five landmark storylets only. The earlier
> `WEEK-2-CONTENT-BRIEF.md` (engine change + activity roster) covers
> infrastructure that should already be merged.

---

## 1. Calendar Shape

Week 2 = Days 8–14 (Mon–Sun). Routine-week mode is now the active engine
(start point moved Day 7 → Day 3 in the prior sprint), so Week 2 runs entirely
inside routine-week mode with class-time blocks fixed.

**Time block convention (routine-week mode):**
- Morning: classes Mon–Fri (no player slot); free Sat/Sun
- Afternoon: free slot every day
- Evening: free slot every day

The week's emotional arc: time starts belonging to other people. The player
ends Week 1 with Glenn's directive in their head and the question of what to
do with the bleed. Week 2 fills their schedule with commitments before they
have the answer. Something has to give. By Sunday they either have a thread
to pull (L5: The Post) or they have a quieter weekend and the question
deferred to Week 3.

---

## 2. Collision Calendar

| Day | Afternoon | Evening |
|---|---|---|
| **8 (Mon)** | **L1: The Job Board** *(triggered by parent call)* — competes with: Western Civ reading, Danny encounter | open — competes with: floor lounge ambient, study time |
| **9 (Tue)** | open — competes with: study time, Herald followup, Priya gate beat | **L4: Tuesday Commitment** *(landmark)* — terminal pivot for the week |
| **10 (Wed)** | **L3: First Shift** *(if job accepted on L1)* — competes with: study group, Mike encounter | open — competes with: post-shift exhaustion, Scott encounter |
| **11 (Thu)** | open — competes with: catch-up reading, Doug/Keith floor beat | open — competes with: floor social, study time |
| **12 (Fri)** | open — competes with: pre-weekend wind-down, Karen Herald check-in | **L2: Scott's Thing** *(Anderson Hall party)* — competes with: study time, library shift if scheduled |
| **13 (Sat)** | open — competes with: hangover/recovery, laundry, study | open — competes with: floor social, lone walk |
| **14 (Sun)** | open — competes with: pre-week prep, calling parents | **L5: The Post** *(gated: see L5 spec)* — or quiet evening if not gated |

**Guaranteed slip check:** A player who accepts the job (L1 → L3 Wed afternoon),
picks the Glenn-directed terminal at L4 (Tue eve), goes to Scott's party (L2 Fri
eve), and reaches L5 (Sun eve) has used 4 of 11 free slots on landmarks alone.
That leaves 7 slots for everything else — Western Civ reading due Wed, Herald
followup, Mike gate beat, Priya gate beat, Doug/Keith friction beats, Danny
catch-up, sleep, and showering. Slip is guaranteed.

**Critical collisions:**
- **Tuesday afternoon vs Tuesday evening:** L4 fires Tue eve, but the player
  who used Tue afternoon for study is making the L4 choice from a different
  energy state than the player who used Tue afternoon socializing. L4's
  available terminals don't change, but their *prose* should reference recent
  activity (via walk flags from Tue afternoon).
- **Wednesday after L3 (job shift):** L3 leaves the player at energy: low.
  Wednesday evening choices are inflected by exhaustion. This is the *first
  time the player feels a job in their body* — a load-bearing texture beat.
- **Friday party vs Sunday investigation:** A player who goes hard at L2 Fri
  has a wrecked Saturday. L5 Sun eve still fires if gated, but the player is
  arriving at the basement terminal worn down — which is right for the scene.

---

## 3. The Five Landmarks

### L1 — The Job Board
**Slug:** `s_w2_the_job_board`
**Setting:** Student Union, Room 204 (job board room). Monday afternoon.
**Primary stream:** Money
**Streams in collision:** Money vs Academic (Western Civ reading); Money vs
  Belonging (Danny is around)
**Trigger:** Fires when player enters Mon afternoon slot AND parent call event
  has fired. (Parent call is a separate Mon-morning ambient beat — see
  Implementation Notes §6.1.)

#### Body / Preamble

> The phone in the hallway rings at 7:42 in the morning. Whoever's closest
> picks it up. It's for you. Your mother's voice does the thing it does when
> she's trying to sound casual. The bookstore charges came through. Plus the
> meal plan supplement. Your father wanted her to mention it, that's all.
> She's not asking you to do anything. She's just mentioning it.
>
> By the time you hang up, three people on the floor have walked past you in
> bathrobes. Doug is making toast in the lounge with the door propped open.
> Somebody's stereo is playing The Police, *Synchronicity*, the song about
> the king of pain.
>
> You eat. You go to class. After lunch, you walk to the Student Union and
> climb to the second floor, because that is where the job board is.

#### Conversational Node Tree

**Node `arrival`** (auto-advance after preamble)
> Room 204 is smaller than you expected. A corkboard the size of a bathroom
> door, layered with index cards and pinned scraps. A folding table under it,
> with a clipboard and a pen on a string. A kid in a Harwick rugby shirt is
> already there, copying something onto a notepad. He doesn't look up.

→ auto-advance to `the_board`

**Node `the_board`**
> You scan the cards. Most are dishwashing or grounds work — you skip past
> them. Three jobs catch your eye for different reasons.
>
> Library shelving. Evenings, mostly. Ten dollars an hour but it's deep
> Periodicals — the basement floor where nobody goes. Need to be reliable;
> they fired the last guy.
>
> Work-study office assistant. Seven AM start, Mondays and Wednesdays. The
> kind of job that pays in resume-line more than dollars. Says "must be
> recommended by an instructor or hold 3.0+ from prior coursework" — and
> you don't have prior coursework. You'd need to ask Marsh.
>
> Off-campus diner. Wallace's, on Route 6. They want weekend nights and
> some weeknights. Pays cash plus tips. Note at the bottom says: "must
> have own transport or live near bus line."

**Micro-choices** (cheap — no time/energy cost):

| Label | Walk flag | Note |
|---|---|---|
| Read the library card more carefully | `read_library` | Adds: "Periodicals basement. The last guy lasted six weeks. The person who pinned this used a red pen and circled 'reliable.'" |
| Read the work-study card more carefully | `read_workstudy` | Adds: "Marsh's name isn't on the card but you've heard students mention him. Asking him would mean walking up to him after Western Civ on Wednesday." |
| Read the diner card more carefully | `read_diner` | Adds: "Wallace's. You've never been there. The bus that runs Route 6 stops outside the Union — you saw it Monday." |
| Look at the rugby kid's notepad | `noticed_rugby` | The kid is copying down a Greek life rush schedule. Not a job. He glances at you, shrugs. |

(Micro-choices stack — player can read all four cards before terminal.)

**Terminal choices** (expensive — commit a slot, set state):

| Label | Effect | Identity tags | Preclusion |
|---|---|---|---|
| **Sign up for library shelving** | Sets `job:library`. First shift = Wed afternoon (L3 variant: library) | `safety`, `achievement` | Closes other two job paths this week |
| **Try to talk to Marsh about the work-study job** | Sets `pending_workstudy` flag. Requires Wed action — go to Marsh after class. May or may not succeed. | `achievement`, `confront` | Doesn't close other paths *yet* — hedges. |
| **Sign up for the diner** | Sets `job:diner`. First shift = Wed afternoon (L3 variant: diner). Adds: transport friction event later. | `risk`, `achievement` | Closes other two job paths this week |
| **Don't sign up for anything. Walk back to the dorm.** | No state change. Money stays Tight. Parent call stays unresolved. | `avoid`, `safety` | The board updates over the week — most cards will be gone by Friday. Job decision deferred to Week 3 with worse options. |

**Notes on prose:**
- The "reliable" detail on the library card is foreshadowing. Library
  shelving rewards consistency and the L3 prose for that variant should
  show what unreliability looks like in the basement.
- The work-study terminal is interesting because it's a *hedged* commitment.
  The player who picks it has to do *something else* on Wednesday (talk to
  Marsh) before the job exists. If they skip Wednesday, the option dies.
  This is the planner's path, with a planner's risk.
- "Don't sign up for anything" is a real terminal. It's not failure. The
  player who picks it has decided, for now, that the parent call wasn't
  enough. Money stays Tight. Reflection engine should later note this as
  an `avoid + financial` pattern if it persists.

---

### L2 — Scott's Thing
**Slug:** `s_w2_scotts_thing`
**Setting:** Room 214 (dorm). Friday evening, around 6 PM.
**Primary stream:** Roommate (Scott). Secondary: Belonging.
**Streams in collision:** Roommate vs Academic (a paper started on weekend);
  Roommate vs Money (Friday-night diner shift if `job:diner`)
**Trigger:** Fires when player enters Fri evening slot AND `npc:scott.trust >= 1`
  OR `floor:bryce_aware == true`. (Otherwise Scott doesn't ask — see miss path.)

#### Body / Preamble

> Scott is putting on a clean shirt. Not his usual flannel. A button-down,
> ironed by someone other than Scott. He sees you watching and says
> "Bryce's brother's in town. There's a thing tonight at Anderson."
>
> He's not nervous exactly. But he's asking.

#### Conversational Node Tree

**Node `the_ask`**
> "I figured you might want to come. It's not — it's not a big deal. It's
> just a thing." Scott does the thing he does where he doesn't make eye
> contact while he says the part he means.

**Micro-choices:**

| Label | Walk flag | Node response |
|---|---|---|
| "Anderson Hall? Whose place?" | `asked_who` | "Bryce's. I mean, it's his floor's thing. His brother went here, graduated last year. He's coming back for the weekend and they're doing a thing." |
| "What kind of thing?" | `asked_what` | "House party. Kegs. People." Scott shrugs. "I think Doug's going. Keith said he might." |
| "Why are you asking me?" | `asked_why` | Scott actually looks at you for this one. "I dunno. You seem like — I dunno. I just figured I'd ask." |
| Wait for him to say more | `waited` | Scott waits too. After a few seconds: "Whatever. You don't have to come." He says it quickly, like he's giving you an out. |

**Node `the_pause`** (auto-advance after any micro-choice)
> Scott finishes with the shirt. He looks at the mirror, decides the shirt
> is fine, decides it isn't, leaves it. Out the window, somebody on the
> quad is shouting somebody else's name. The light is the kind of light
> Friday afternoons have when the week is breaking apart.

→ terminal choices

**Terminal choices:**

| Label | Effect | Identity tags | Preclusion |
|---|---|---|---|
| **"Yeah, alright. Give me ten minutes."** | Sets `attended:bryce_party`. Time cost: full evening. Energy cost: high. Sets `npc:scott.trust +1`, `npc:scott.reliability +1`, `floor:bryce_aware true`. Adds Sat morning recovery flag. | `people`, `risk` | Closes academic Fri eve. If `job:diner` and Fri shift scheduled — must skip; sets `npc:wallaces.reliability -1`. |
| **"I've got a paper to start. Maybe next time."** | Time cost: 1 (academic work). Energy cost: 1. Sets `npc:scott.reliability +0`, but sets `npc:scott.emotional_load +0.5` (he asked, you said no — he registers this even if he doesn't show it). Earns `study_progress +1`. | `safety`, `achievement` | Closes Bryce-orbit invitation chain for Week 2. Anderson Hall remains unfamiliar geography. |
| **"Tonight's not great. I'm wiped."** | Time cost: 0 (rest). Energy: recovers. No academic gain. `npc:scott.reliability -0.5` — Scott reads this as the soft no it is. | `avoid`, `safety` | Closes party. Closes academic gain. Wide miss. |
| *(Gated: requires `job:diner`)* **"Can't. I've got a shift."** | Goes to diner. Pay event fires. `npc:scott.reliability +0` (legitimate excuse). `npc:wallaces.reliability +1`. | `achievement`, `safety` | Closes party. Closes academic. Earns money. |

**Notes on prose:**
- Scott's character beat: he doesn't ask people to things easily. The fact
  that he's asking *means* something, and the player who notices the shirt
  and the not-eye-contact will register that. The player who doesn't notice
  reads this as a casual invite and underweights the relational stakes.
- The window-shouting and the breaking-apart light are texture beats — they
  don't push toward a choice, they just locate the moment in physical space.
- "The shirt is fine, decides it isn't, leaves it" — Scott rehearsing for
  himself. This scene is partly about Scott figuring out who he wants to be
  this semester. The player is incidentally watching it happen.
- The Bryce party itself is **not built in this brief** — it's a Week 2
  consequence event that fires Sat morning (recovery flag, walk flags from
  party behavior, possibly a Bryce trust deposit). The party itself can be
  built as a separate landmark in Week 3 sprint or as ambient consequence
  prose. Flagging for Code.

---

### L3 — First Shift
**Slug:** `s_w2_first_shift_{variant}` (3 variants)
**Setting:** Varies by job. Wednesday afternoon (`job:library`, `job:diner`)
  or Wednesday morning early (`job:workstudy`).
**Primary stream:** Money (executes the L1 commitment)
**Streams in collision:** Money vs Academic (study group forming Wed PM);
  Money vs Belonging (Mike often around library afternoons)
**Trigger:** Fires Wed when corresponding job flag is set. If `pending_workstudy`,
  fires only if player completed Marsh-talk action (see Implementation Notes §6.2).

#### L3 Variant A: `s_w2_first_shift_library`

##### Body
> The basement of Whitmore Hall has a smell — paper, old paper, and the
> particular dryness of fluorescent-lit air that hasn't moved in a decade.
> The supervisor is a graduate student named Lenore who hands you a cart
> and a list and tells you to put the things on the list back where they
> belong. She does not stay to watch.

##### Nodes

**Node `the_cart`**
> The cart has eleven items on it. Most are bound periodicals, the kind
> with the year stamped on the spine. *American Journal of Sociology*,
> 1971. *Foreign Affairs*, 1968. The Dewey numbers are written on the
> spine in white ink that's flaking off. You walk down the first aisle
> and start finding the gaps.

→ auto-advance to `the_quiet`

**Node `the_quiet`**
> You don't see another person for forty minutes. The only sounds are
> the soft tick of the fluorescent ballast and the whisper of pages when
> you slide a volume into its slot. Somewhere on a higher floor, someone
> is laughing about something. Down here, you could disappear.

**Micro-choices** (texture only — no state):

| Label | Walk flag | Node response |
|---|---|---|
| Read a page from the *Foreign Affairs* — about Vietnam | `read_vietnam` | An article from 1968, written before the writer knew what was going to happen. The author sounds confident. You put the volume back. |
| Sort the cart efficiently before reshelving | `sorted_efficiently` | The work goes faster. You finish the cart in an hour instead of two. Nobody is here to notice. |
| Daydream | `daydreamed` | You catch yourself standing in front of the same shelf for ten minutes. The floor doesn't care. |

→ terminal

**Terminal choices:**

| Label | Effect | Identity tags |
|---|---|---|
| **Finish the cart and clock out** | `money_band: Tight → Okay (after 3 shifts)`. Energy: low. Sets `npc:lenore.reliability +1`. Time cost: full afternoon. | `safety`, `achievement` |
| **Finish the cart, then ask Lenore if there's more** | Same money effect plus `lenore.reliability +2`. Energy: very low. The graduate student is surprised. "Sure. Take this one." | `achievement`, `people` |
| **Leave when the assigned cart is done — even though twenty minutes are left on your shift** | `lenore.reliability -1`. Energy: moderate (you preserved some). Money still credited for full shift this time. | `risk`, `avoid` |

##### Texture notes
- The 1968 *Foreign Affairs* article is a déjà vu hook. The player who
  reads it is touching the time-travel frame without knowing it — they
  *know* what comes after 1968 in a way the article's author didn't. This
  is a quiet bleed beat. No system effect. Just feel.
- "You could disappear" is the library variant's emotional center.
  Library shelving is the absorber's job. The reflection engine, later,
  may use this for an arc-end observation.

---

#### L3 Variant B: `s_w2_first_shift_workstudy`

##### Body
> The work-study office is in the administration building, on the second
> floor of a wing the public never sees. You arrive at 6:55 AM on
> Wednesday because Marsh said the office manager — a woman named Mrs.
> Pettit — does not tolerate lateness. The hallway is empty. The lights
> are on a sensor and they take three seconds to come up after you walk
> through them.

##### Nodes

**Node `mrs_pettit`**
> Mrs. Pettit is at her desk already. Coffee, a typewriter, a stack of
> faculty memos. She looks up over half-frame glasses. "Marsh said you'd
> be on time." She does not say it warmly. She does not say it coldly.
> She says it like she has been told a fact and is now confirming the
> fact is accurate.

**Micro-choices:**

| Label | Walk flag |
|---|---|
| "Yes ma'am." | `formal_response` |
| "Thanks for having me." | `warm_response` |
| Just nod and wait | `silent_response` |

**Node `the_work`** (auto-advance)
> She hands you a stack of carbon-copy forms and a list of department
> mailboxes. The work is sorting. Then filing. Then more sorting. None of
> it is hard. All of it requires you to be paying attention. Mrs. Pettit
> does not check on you. Mrs. Pettit also does not need to check on you,
> because the work is the kind of work where mistakes show up later and
> get traced back.

**Micro-choices:**

| Label | Walk flag |
|---|---|
| Work fast | `fast_work` (risks mis-sort, sets `mispast_attempted`) |
| Work carefully | `careful_work` (no errors, slower) |
| Try to work fast and careful | `attempted_both` (rolls against `study_discipline`) |

→ terminal

**Terminal choices:**

| Label | Effect |
|---|---|
| **Finish the assigned work and leave at 8:00 AM as scheduled** | `money_band: Tight → Okay (after 4 shifts)`. Energy: moderate. Sets `npc:pettit.reliability +1`. `study_discipline +0.5`. |
| **Finish early, ask Mrs. Pettit if there's anything else** | Pettit looks at you for a long moment. "There's always something else." She gives you another stack. `pettit.reliability +2`, energy: low. |
| **Make a small mistake** *(only if `fast_work` walk flag set)* | A misfiled memo. Pettit will notice this afternoon. `pettit.reliability -1` set on a delay timer (fires Thu morning). |

##### Texture notes
- The "lights on a sensor" detail is era-specific texture (motion-sensor
  lighting was beginning to be installed in admin buildings in the early
  80s — not yet standard). Subtle.
- Mrs. Pettit is named, but she's not a recurring NPC roster slot — she's
  staff. Code can implement her as a `staff` NPC with limited memory
  surface. Flagging for Code.
- The work-study variant's emotional center is *being seen by an institution*.
  Mrs. Pettit's neutrality is the inverse of the library's invisibility.
  Reflection engine pattern note.

---

#### L3 Variant C: `s_w2_first_shift_diner`

##### Body
> The bus to Wallace's runs every forty minutes. You catch it at 3:15 PM
> outside the Student Union. It is mostly empty. You watch the campus
> recede through a window streaked with somebody else's hand-print.
> Wallace's is on Route 6, between a closed gas station and a tax
> preparer's office that looks like it was last painted in the Carter
> administration.
>
> The owner, Hal Wallace, is a man in his sixties who shakes your hand
> with three fingers because the other two are taped together. He shows
> you the kitchen, the pass-through, the soda fountain, and the dishpit.
> He says "you'll figure it out" and goes back behind the counter.

##### Nodes

**Node `the_pace`**
> Six-thirty PM hits and the dinner rush begins. A truck driver wants
> his eggs over easy, the trucker behind him wants them over medium,
> and the third guy at the counter wants to know if you have any decaf.
> The waitress, a woman named Charlene who is older than your mother,
> moves around you like you're a piece of furniture.

**Micro-choices:**

| Label | Walk flag |
|---|---|
| Try to keep up with Charlene | `kept_up` |
| Stay out of her way | `stayed_out` |
| Ask her what to do | `asked_charlene` |

**Node `the_break`** (auto-advance)
> At 8:15, Hal lets you take fifteen minutes. You go out the back door.
> The lot smells like fryer oil and gasoline. There is a payphone bolted
> to the wall of the building, and a styrofoam cup full of cigarette
> butts on top of it. You can hear the bug zapper from the gas station
> next door.

**Micro-choices:**

| Label | Walk flag |
|---|---|
| Smoke a cigarette (gated: requires `flag:smokes`) | `smoked` |
| Watch the bug zapper | `watched_zapper` |
| Use the payphone to call somebody | `called_someone` (sets pending parent-call event) |
| Go back inside early | `returned_early` |

→ terminal

**Terminal choices:**

| Label | Effect |
|---|---|
| **Finish the shift. Catch the 11 PM bus back.** | `money_band: Tight → Okay (after 2 shifts)` (best pay). Energy: very low. Sets `npc:wallaces.reliability +1`. Sets Thu morning fatigue flag (lower energy ceiling for Thu only). |
| **Finish the shift. Hal offers to drive you back.** *(gated: requires `kept_up` walk flag)* | Same money. Energy: low (saved bus time). Hal asks where you go to school. The conversation is short. He used to know somebody who taught there. He doesn't say who. `wallaces.reliability +2`. Sets ambient flag `hal_knows_someone` for possible Week 3+ payoff. |
| **Walk out at 9 PM. Tell Hal you can't do this.** | No pay. `wallaces.reliability -2`. Bus home. Energy: moderate. Sets `quit_diner` — the diner option is closed permanently in Arc One. |

##### Texture notes
- The Carter-administration paint detail is period-specific without being
  museum. The author's invitation to the player: 1983 still has visible
  ghosts of 1976 in it. Texture accumulates.
- Charlene is staff. Hal is staff. Both can be implemented with limited
  memory surfaces.
- The hal_knows_someone hook is a deliberate seed — possible payoff in
  Week 3+ if Glenn track threads through it. Not specified here. Open.

---

### L4 — Tuesday Commitment
**Slug:** `s_w2_tuesday_commitment`
**Setting:** Room 214 (dorm). Tuesday evening, 7-ish.
**Primary stream:** All four (this is the week's pivot landmark)
**Streams in collision:** Itself — this storylet IS the collision.
**Trigger:** Fires Tue evening unconditionally if the player has a free Tue
  eve slot. (If something fired earlier — unlikely in current architecture —
  L4 defers to Wed eve as fallback. Code: please confirm fallback handling.)

#### Body / Preamble

> You sit down at your desk. The Western Civ reading is open to a chapter
> on Charlemagne. Scott is at his desk, headphones on, doing math problems.
> The dorm phone in the hallway rings and somebody picks it up — not for
> you.
>
> You have the evening. You have one evening. You don't have all of them.
>
> You think through what's actually in front of you.

#### Nodes

**Node `the_inventory`** (auto-advance)
> The Western Civ reading is sixty pages and you're forty pages behind.
> The study group Mike mentioned is meeting in the library lounge at 8.
> Scott said the Sigma house is doing a movie night — *The Big Chill* on
> a borrowed projector. Doug stuck his head in earlier and said something
> about a poker thing in 218. And there is the other thing — the thing
> Glenn said. About the terminal. In Whitmore basement. *Look around the
> stacks. Read what people are arguing about.*

#### Micro-choices (cheap)

| Label | Walk flag | Node response |
|---|---|---|
| Think about Mike | `weighed_mike` | Mike is a real person who would notice if you didn't show. The study group is a real opportunity. The Western Civ reading is real. |
| Think about Scott | `weighed_scott` | The Sigma movie is the kind of thing where you meet people. You haven't really *been* anywhere social yet this week. Scott seems like he'd want you to come. |
| Think about Doug's poker | `weighed_doug` | Doug's poker is just Doug's poker. Five guys, two-dollar buy-in. You've played twice already. It would be easy. |
| Think about Glenn's terminal | `weighed_glenn` | The terminal is in a basement. You don't know what you'd do once you got there. But Glenn said. And the bleed has been louder this week. |
| Think about the reading | `weighed_reading` | Forty pages. Manageable in an evening if you don't do anything else. |

(Player can weigh multiple. The terminal choice prose adapts to which were weighed — the player who weighed `glenn` and `reading` is committing under different awareness than the player who weighed only `doug`.)

#### Terminal choices

| Label | Effect | Identity tags | Preclusion |
|---|---|---|---|
| **Library lounge. The study group.** | Time/energy cost: 1/1. Sets `attended:study_group_w2`, `npc:mike.trust +1`, `study_progress +2`, `study_discipline +0.5`. | `achievement`, `people` | Closes the other three. The Sigma movie happens without you. Doug doesn't notice. Glenn's terminal stays unvisited (recoverable Sun via L5 if `weighed_glenn` set). |
| **Sigma house. The movie.** | Time/energy cost: 1/1. Sets `attended:sigma_movie`, `floor:sigma_aware true`. May add a new Sigma-orbit NPC reference (open — Code can implement this as a deferred encounter for Week 3). | `people`, `risk` | Closes study group, poker, terminal. Mike will notice the absence (sets `mike.reliability -0.5`). Reading stays at 40 pages behind. |
| **Doug's poker. 218.** | Time/energy cost: 1/0 (low energy). Sets `attended:poker_w2`, `npc:doug.reliability +1`, `npc:keith.trust +0.5`. Money: -2 dollars (buy-in, no realistic chance of winning meaningfully). | `safety`, `people` | Closes study group, movie, terminal. Reading stays behind. Mike notices but less acutely than the movie path (he expects less of you). |
| **The terminal. Whitmore basement.** | Time/energy cost: 1/1. Sets `visited_terminal_w2`, `glenn_arc:investigation_started true`. Opens L5 (The Post) Sun eve with no further conditions. *No NPC interactions this evening.* | `risk`, `confront`, `achievement` | Closes everything social this evening. Mike, Doug, Scott all register absence — Mike sets `mike.reliability -0.5`, Doug sets `doug.reliability -0.5`, Scott sets `scott.emotional_load +0.5`. Reading stays behind. |
| **Stay in. Read the Charlemagne chapter.** | Time/energy cost: 1/1. Sets `study_progress +3`, `study_discipline +1`. Sets nothing else. | `safety`, `avoid`, `achievement` | Closes everything. The dorm gets quiet around 9 and you finish around 10:30. The reading is done. The week is exactly as it would have been if no one had asked anything of you. |

#### Notes on L4

- This is the week's most important storylet. Five terminals, each with
  weight, none with a "right" answer. The L5 dual-gate decision means the
  terminal choice (`The terminal. Whitmore basement.`) is the *direct*
  path to L5, but the Glenn Day 5 follow-up flag also opens it — meaning
  a player who picked Glenn-related content earlier in Week 1 can pick the
  study group here and still reach L5. The terminal-choice path is the
  *committed* investigator's; the Glenn-flag path is the *patient*
  investigator's.
- The "Stay in. Read." terminal is the safety/avoid path. Reflection should
  honor it — there is dignity in saying no to all of it. But there's also
  cost: nothing is built. The week, for this player, is what they did
  by themselves at a desk.
- **Conditional prose on micro-choices:** Each terminal's body should
  reference what the player weighed. A player who picked `Mike` after
  weighing `Glenn` and `reading` should see prose that names the cost of
  the path not taken. Code implementation note: this is straightforward
  conditional prose insertion via walk flag check.

---

### L5 — The Post
**Slug:** `s_w2_the_post`
**Setting:** Whitmore Hall basement, terminal room. Sunday evening.
**Primary stream:** Investigation (frame). Secondary: solo reflection.
**Streams in collision:** vs Academic (Sunday is reading-catchup time);
  vs Roommate (Scott may want to talk about the week)
**Trigger (dual gate):** Fires Sun eve if EITHER:
  - `visited_terminal_w2 == true` (from L4 terminal-direct path), OR
  - `glenn_followup_flag == true` (from Glenn Day 5+ ambient beat in Week 1)

(If neither flag set: L5 does not fire. Sunday evening is open. See miss path §4.5.)

#### Body / Preamble

> The terminal room is one VT100 on a folding table in a corner of the
> basement, behind the climate control unit. Whoever set it up didn't
> mean for it to be hidden — they just put it where there was an outlet.
> The room smells like dust and machine warmth. The screen is amber on
> black. The cursor blinks.
>
> You log in with the credentials Glenn wrote on the back of a flyer.
> The system prompt comes up. You type the command for the Usenet
> reader, the way Glenn showed you. The newsgroup list scrolls.
>
> *net.misc. net.politics. net.sci. net.flame. net.unix-wizards.*
>
> You scroll. You don't know what you're looking for. You start
> reading.

#### Nodes

**Node `the_browse`** (auto-advance)
> Most of it is what you'd expect. People arguing about Unix. People
> arguing about politics. People arguing about whether the new Star
> Wars movie is going to be any good. The threads scroll up the screen
> faster than you can really read them. You let them go.

#### Micro-choices

| Label | Walk flag | Node response |
|---|---|---|
| Search for keywords from the future | `searched_future` | You try a few. *Internet* (matches: 0). *Personal computer* (matches: 8 — all hardware geeks). *Soviet Union collapse* (matches: 0). The 1983 web doesn't have words for what you know. |
| Browse net.misc | `browsed_misc` | Random. Somebody's lost cat. Somebody's argument with their roommate. Somebody asking if anyone here knows about a chess opening. Background noise of a smaller world. |
| Browse net.politics | `browsed_politics` | Reagan. Beirut. The nuclear freeze. The arguments are sharper than you expected. People here believe things and will fight about them. |
| Browse net.sci | `browsed_sci` | Mostly graduate students arguing about peer review. One thread about something called "molecular biology computational modeling." A few names recur. |

→ auto-advance to `the_post`

#### Node `the_post` (the trace)

> You scroll into a thread in `net.misc`. Title: "Question for anyone who
> remembers." The post is short.
>
> *I am trying to find out something specific. In 1981, did the bookstore
> at — [the next word is your university's name] — sell a particular
> textbook for a History of Science class taught by Professor [redacted].
> I need to know the publisher. I have my reasons. Please email if you
> remember. -- @KESTREL*
>
> The post is dated three weeks ago. There are two replies. One is from
> somebody who took the class in 1981 and remembers the textbook (it was
> Kuhn). The other is two words: "why ask."
>
> @KESTREL has not replied to either.

#### Micro-choices (the trace investigation)

| Label | Walk flag | Node response |
|---|---|---|
| Read @KESTREL's post again | `reread_kestrel` | Something about the phrasing. *I have my reasons.* Nobody asks about a textbook publisher unless they're trying to date something — to verify a moment in time. |
| Look at @KESTREL's other posts | `searched_kestrel` | Five posts in the last six months. All in different newsgroups. All asking about specific small details from specific years. None of them about ideas. All of them about *facts that fix a moment*. |
| Reply to @KESTREL | `replied_kestrel` | (Gated: requires `searched_kestrel`.) The terminal lets you compose a message. You stare at the blinking cursor. What would you say? |
| Note @KESTREL's username and log out | `noted_kestrel` | You write the username in the margin of your Western Civ notebook. *KESTREL.* It looks ordinary on the page. |

#### Terminal choices

| Label | Effect | Identity tags | Notes |
|---|---|---|---|
| **Compose a reply to @KESTREL.** *(gated: `searched_kestrel`)* | Sets `contacted_kestrel`. Opens a sub-conversation about *what to say*. (Code: this should branch into 2-3 reply options — anodyne, oblique, direct.) Closes the option of approaching anonymously later. Significant Arc Two consequence — flagged. | `risk`, `confront` | This is the contact decision. A player who hits send is making a call that pays off (or backfires) in Arc Two. |
| **Note the username. Log out.** | Sets `noted_kestrel`. Sets `glenn_arc:trace_logged true`. The terminal stays a tool. KESTREL stays a question. Sunday ends with the question sharper than it was Friday. | `safety`, `confront`, `achievement` | The patient investigator's path. Most players should land here. |
| **Don't engage with the post. Browse a while longer, then log out.** | Sets `glenn_arc:terminal_used true` but no trace logged. The session was investigative *as practice*. The player has learned the terminal exists and how to use it. KESTREL stays in the archive, unread by them. | `safety`, `avoid` | The hesitant investigator. Recoverable Week 3+ via deliberate return. |
| **Log out without reading further. The basement is making your skin crawl.** | No trace flags. Energy: moderate. Sets `glenn_arc:terminal_visited true` (weakest flag — they were here but didn't really engage). | `avoid`, `safety` | The deflective option. Real. The player who picks it has decided this isn't for them, at least tonight. |

#### Notes on L5

- **The trace is the deliverable.** Per lore bible §1.5 ("Traces — not
  people — are the Arc One deliverable"). KESTREL is not met. KESTREL is
  found *as a pattern*. The player leaves Week 2 with a username and a
  question, not a relationship.
- **The reply option is the Week 2 fork that pays off in Arc Two.** A
  player who composes and sends has, without realizing the weight,
  initiated contact with another Knower (or someone who looks like one).
  Arc Two should treat this as a major branch.
- **The "skin crawls" terminal is a deliberate rest stop.** Not every
  player should push the investigation. The bleed is uncomfortable. A
  player who picks this is honoring the discomfort, and the game should
  not punish that. Reflection later may name it: "You stood at the door
  and decided not to open it."
- **Period accuracy:** VT100 amber-on-black is correct for 1983 lab
  terminals. Usenet newsgroups listed (net.misc, net.politics, net.sci,
  net.flame, net.unix-wizards) are real 1983 newsgroups — verify with
  Code if anything reads anachronistically. Kuhn's *Structure of
  Scientific Revolutions* was an active History of Science text in 1981.
- **The KESTREL post must NOT name the university.** The post is *about*
  the player's university (matching by elision) but the player infers
  this. The redaction in the post text is the gameplay artifact — the
  player who notices that the bookstore reference matches their school
  has done the inference work.

---

## 4. Miss Paths

### 4.1 L1 Miss Path — Player ignores parent call, doesn't go to job board

The phone calls escalate. By Friday, a second call from your mother. By the
following Monday, a letter from your father — handwritten, two pages. Money
band stays Tight. Doug, who works in the dining hall, mentions in passing
on Friday that they're hiring. The job board itself is not closed — the
player can return Week 3, but cards have rotated and the diner option is
gone (somebody else took it). Library shelving is still available with a
note: "MUST BE RELIABLE. Last person made it three weeks." Work-study is
gone. Marsh has filled the slot.

### 4.2 L2 Miss Path — Scott doesn't ask (gate not met)

If `scott.trust < 1` AND `floor:bryce_aware == false`, Scott gets dressed
and leaves without saying anything to the player. The player notices the
ironed shirt. They notice Scott didn't say where he was going. Saturday
morning, Scott is back, and there's a faint hangover and a story he's
telling somebody else in the hallway that he doesn't tell the player.
This is a *quiet relational consequence*. No system penalty. Just a
small distance the player can feel.

### 4.3 L3 Miss Path — Job accepted but player skips the shift

For library/diner: the player simply doesn't show. Lenore/Hal does not
call (no easy way to). Wednesday afternoon happens elsewhere. Thursday
morning, a written note appears in the player's mailbox (slot, not
visible UI) — sets `npc:lenore.reliability -2` or `npc:wallaces.reliability -2`.
The job is **terminated**. Money band stays Tight. The player has burned a
bridge they didn't realize they were building.

For work-study: Mrs. Pettit calls Marsh. Marsh mentions it in class on
Friday. The player's `pending_workstudy` flag converts to
`workstudy_failed` flag. Marsh's `trust` takes a -1 hit. The work-study
option is closed for the semester.

### 4.4 L4 Miss Path — Player does nothing Tue eve

This is technically not a "miss" — the player picked the "Stay in. Read."
terminal or the slot was used by an earlier-firing event. But for the
purpose of L5 gating: if neither `visited_terminal_w2` nor
`glenn_followup_flag` is set by Sun, L5 does not fire. The week ends
quieter. The reading is caught up. The investigation sleeps another week.

### 4.5 L5 Miss Path — Neither L5 gate met

Sunday evening is free. Ambient prose: *The dorm is quiet. Most people
called their parents earlier. Scott is reading something for class. You
have the evening to yourself.* A reflective small storylet (1-2 nodes)
where the player can: write a letter home (sets `wrote_home_w2`), go
to bed early (sets energy: high for Mon), or wander the quad alone
(sets `solo_walk_w2`, ambient mood deposit). None of these reach the
investigation. The week ends in a different shape — quieter, more
internal, no thread pulled.

This is not a punishment. It's a different week. The player who lands
here may discover the terminal in Week 3 via a different trigger, or
may never. The lore bible's "find the others through traces" arc is
designed to tolerate this — Glenn will resurface in Week 3-4 with
another nudge.

---

## 5. Period Friction Beat Hooks

The PERIOD-FRICTION-CONTENT-MAP defines beats 2A–2F across Days 2–14.
Three of those beats land in Week 2 territory and should be wired into
existing Week 2 storylets as conversational nodes. Brief attachment
notes for Code:

| Beat | Window | Attach to | Notes |
|---|---|---|---|
| **2B: Peterson's Joke** | Day 8–10 | Either L2 (Anderson party prep, before the leave) or a Doug/Keith floor lounge ambient storylet (currently unbuilt — flagging) | If attached to L2, fires *before* Scott's ask, on the same evening. Player's response affects the social texture going into Anderson. |
| **2D: Study Group Assumption** | Day 8–12 | L4 micro-node (if Mike study group terminal taken) — fires on arrival at the lounge | The note-taking moment happens before study begins. Player's response sets walk flags that color the rest of the study scene. |
| **2F: TV Conversation** | Day 5–9 | Either evening floor lounge ambient (unbuilt) or Day 8 evening before L1 | Lower priority for Week 2 sprint. Can defer to Week 3. |

**Sprint scope decision needed:** Are friction beats 2B and 2D in scope for
this sprint, or held until period_stance tracking infrastructure is built
in a later sprint? The friction map's open question §4.4 ("What Code
Needs") flags `period_stance` identity tag support as required. If that
infrastructure is not yet built, the friction beats should be specified
but **not implemented** in this sprint — they'd land as ungated micro-choice
nodes without state effect, which would be worse than not having them.

---

## 6. Implementation Notes for Code

### 6.1 The Parent Call Event (L1 trigger)

Mon morning, before the player's first slot, an ambient "you got a call"
event fires. This is NOT a storylet — it's a 1-2 sentence prose injection
into the morning preamble that sets `parent_call_received_w2` flag. L1
checks this flag.

If implementation cost is high, this can be folded INTO L1's body as the
opening paragraph (as written above). Decide based on whether the morning
preamble system supports event injection at slot-start.

### 6.2 The Marsh Talk (L3 work-study path)

L1's "Try to talk to Marsh" terminal sets `pending_workstudy`. To
convert this to `job:workstudy`, the player must take an action on
Wednesday: either select a "Talk to Marsh after Western Civ" terminal
choice in a Wed morning storylet (currently unbuilt), or have it fire
automatically as a brief node attached to the existing Wed academic
storylet (if one exists).

**Recommended:** Implement as a brief auto-firing node attached to the
end of the player's Wed morning Western Civ class slot. Two
micro-choices: "Approach Marsh after class" (converts pending → job)
or "Don't approach him today" (converts pending → workstudy_failed
after 24h grace).

### 6.3 L5 Dual Gate Implementation

`visited_terminal_w2` set by L4 terminal choice "The terminal. Whitmore
basement." Straightforward.

`glenn_followup_flag` should be set by a beat in Week 1's existing Glenn
arc. If the Day 5 "Glenn's Walk" beat doesn't currently set this flag,
add it as an emit to whichever terminal in that scene constitutes Glenn
"giving the directive." Code: please verify which Day 5 Glenn beat
should carry this flag.

### 6.4 Cross-Track default_next_key Handling

Per CONTENT-RULES Rule 3: none of the L1–L5 storylets should chain via
`default_next_key` across tracks. Set `default_next_key: NULL` on all
five landmarks' terminal choices. Any cross-track follow-up should use
the events_emitted system, not chains.

### 6.5 Energy Floor After L3

The diner variant's "very low energy" outcome should set a Thu-morning
energy ceiling, not just a current-energy decrement. This is new
behavior — verify the energy system supports time-bounded ceilings,
or implement as a Thu-morning event that decrements energy at slot-open.

### 6.6 NPC Memory Surfaces for Staff

L3 introduces three staff NPCs (Lenore, Mrs. Pettit, Hal Wallace +
Charlene). These don't need full npc_* records with the relational
state machine. Recommendation: implement as `staff` type with two
memory dimensions only (reliability, trust), no emotional_load. Code:
confirm whether the staff NPC pattern exists or needs to be added to
the schema.

### 6.7 The Anderson Party Itself

L2 ends with the player either going to the party or not. The party
itself is NOT in this sprint. Recommendation: implement Sat morning
recovery flag and 1-2 sentence ambient consequence prose, and defer
the actual party storylet to Week 3 sprint or a dedicated party
sprint. The party is the kind of scene that wants real space (multiple
nodes, friction beats, Bryce-orbit NPCs) and Week 2 sprint capacity is
better spent on the five landmarks.

---

## 7. Open Questions for Monty

These don't block Code from starting — they can be resolved in parallel
with implementation.

1. **Sprint scope for friction beats 2B, 2D, 2F:** Build now (requires
   `period_stance` infrastructure) or specify-only and build in next
   sprint?
2. **The Anderson party as separate landmark:** Build in Week 3 sprint, or
   fold into Week 2 if capacity allows?
3. **L5 reply-to-KESTREL sub-branch:** Worth building the 2-3 reply
   options now (anodyne / oblique / direct) or specify the branch and
   implement it when Arc Two payoff is being designed?
4. **Hal Wallace's "knew somebody who taught there" hook:** Real seed for
   later (e.g., Marsh's predecessor, a Knower's cover identity), or
   purely texture? If real seed, name it now so Code can flag the
   payoff. If texture, fine to leave open.
5. **Staff NPC schema:** If staff NPCs don't currently exist as a
   pattern, is it worth adding now (Lenore, Pettit, Hal, Charlene),
   or should they be implemented as full npc_* records with truncated
   memory surfaces?

---

## 8. Editorial Pass Checklist (for the editorial review stage)

Before insert, verify each landmark passes:

- [ ] No "a wave of [emotion] washed over"
- [ ] No symmetrical "Part of him wanted X. But another part..." pairs
- [ ] No naming emotions when surrounding detail carries them
- [ ] No explaining what a choice means in the prose — let the choice speak
- [ ] No NPC names in labels before the player could know them
- [ ] At least one period-specific physical detail per scene
- [ ] All micro-choices cost 0 time and 0 energy
- [ ] All terminal choices preclude something
- [ ] Every scene has a guaranteed-slip alternative in the same time slot
- [ ] Miss path authored, not silent

<!-- ///////////////////////////////////////////// -->
<!-- FRAGMENT — not a complete standalone document -->
<!-- Intended for: docs/ folder in MMV repo       -->
<!-- ///////////////////////////////////////////// -->
