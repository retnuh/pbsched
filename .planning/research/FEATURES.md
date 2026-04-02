# Feature Research

**Domain:** Pickleball practice session scheduler (single-organizer, local-first SPA)
**Researched:** 2026-04-02
**Confidence:** HIGH — core scheduling features well-documented across multiple existing products; pickleball-specific social play organizer needs verified through multiple sources

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features any scheduling tool for this domain must have. Missing these makes the product non-functional.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Attendance roster — pick who showed up | Every organizer's first step before any round can be generated | LOW | Simple multi-select from a saved member list |
| Round generation — 2v2 court groupings | Core product value; without this there is no product | MEDIUM | 4 players per court; must handle N players across M courts |
| Odd player count handling | Almost every real session has a non-divisible-by-4 player count; organizers encounter this constantly | MEDIUM | Sit-out rotation OR 3-player court; organizer chooses the strategy |
| Variety optimization — minimize repeat partners/opponents | Primary complaint against manual scheduling is unfair repetition; competitors (Pickleheads, MatchUp) all solve this | HIGH | Scoring-based candidate evaluation; see PROJECT.md algorithm decision |
| Persistent member roster across sessions | Organizer should not re-enter player names every week | LOW | localStorage; per-club list |
| Round display — readable on phone screen | Organizer reads matchups aloud from their phone at courtside; tiny text or complex layout fails | LOW | Clear court-by-court grouping, large tap targets |
| Advance round count — set N rounds upfront | Organizers pre-commit to a session structure; they need to announce "we're doing 8 rounds tonight" | LOW | Simple numeric input; drives how many rounds to generate |
| Mark a round as played / advance to next round | Without tracking which round is current, the organizer cannot remember where they are in a session | LOW | Simple "next round" state; does not require score entry |

### Differentiators (Competitive Advantage)

These are where this product wins against existing tools. Most competitors either require accounts/servers, focus on tournament-not-practice use cases, or lack the variety optimization depth.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multi-club roster support | Organizers who run play at multiple venues keep separate member lists; no existing local-first tool handles this | LOW-MEDIUM | Club switcher; each club has independent roster and can be active one at a time |
| Mid-session player add/remove with automatic round regeneration | Real sessions always have late arrivals and early departures; PlayMore's most-praised feature; missing from most schedulers | MEDIUM | When roster changes, regenerate all unplayed future rounds using updated player list |
| View and choose from top-N generated schedules | Gives organizer agency when generated schedule has a known social conflict (two players who should not be paired) | MEDIUM | Generate K candidates, rank by score, present top 3–5 for organizer to preview and pick |
| Tunable scoring weights via advanced settings | Allows developer and power-user organizers to experiment with how strongly to penalize repeat partners vs repeat opponents | LOW | Hidden behind an advanced settings screen; sensible defaults mean most users never touch it |
| Extend session on the fly | Organizers frequently decide to add more rounds once a session is going well | LOW | "Add round" button appends one more generated round to the session |
| No account required, fully local | Every existing competitor that handles variety optimization requires account creation and a backend; this works from a phone browser instantly | NONE (it's an absence) | GitHub Pages + localStorage = zero friction to start |
| Offline / no-connectivity required | Gyms and recreation centers often have poor cell signal; the app cannot depend on network during a session | NONE (consequence of architecture) | Static SPA + localStorage inherently offline-capable |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like good ideas but conflict with this product's core constraints or dilute focus.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Score tracking | Organizers see competitors (Pickleheads, PlayMore) doing it; natural request | Dramatically increases session state complexity; requires score entry UX mid-play; out of scope per PROJECT.md | Provide "round played" confirmation only — no numeric scores |
| Real-time multi-device sync | "Other organizers at the club want to see the schedule too" | Requires a backend or WebRTC; destroys the static/local-first architecture constraint | Share by reading the app aloud or showing the phone screen |
| Player accounts / profiles | "Players want to track their own history" | Account system = backend = not a GitHub Pages static app | Organizer-only app; player history is not the product's job |
| Skill-level balancing in matchups | Seen in PlayMore, Pickleheads; organizers naturally ask for it | Adds a second optimization axis that conflicts with variety; small practice groups (6–12) have known skill levels that organizers account for socially | Document that the algorithm optimizes for variety, not balance; trust organizer judgment on player selection |
| Court reservation / time slot scheduling | Adjacent feature many scheduling apps bundle | Completely different domain; adds court availability, time constraints, booking UX; no value for a practice-session matchup generator | Out of scope; this product generates who plays who, not when they play |
| Push notifications / reminders | Standard feature in PlayMore, PlayTime | Requires a backend or push notification service; impossible in a static SPA without a service worker + push API subscription flow | Out of scope for v1; static SPA with no server cannot send notifications |
| DUPR or rating system integration | Pickleheads offers DUPR submission; players ask for it | Requires API credentials, backend proxy (CORS), account linking; incompatible with static-only constraint | Out of scope; this is a practice tool, not a rated event |
| Export to PDF / printable schedule | Common request in tournament schedulers | Low organizer value for a phone-screen app; adds a formatting/layout subsystem | The on-screen round display is the output; no print layer needed for v1 |

---

## Feature Dependencies

```
[Member Roster (per club)]
    └──required by──> [Attendance Selection]
                          └──required by──> [Round Generation]
                                                └──required by──> [Variety Optimization]
                                                └──required by──> [Round Display]
                                                └──required by──> [Odd Player Handling]

[Multi-Club Support]
    └──enhances──> [Member Roster (per club)]

[Round Generation]
    └──required by──> [Mid-Session Player Changes]
    └──required by──> [Extend Session]
    └──required by──> [Top-N Schedule Alternatives]

[Advance Round Count]
    └──enhances──> [Round Generation]

[Tunable Scoring Weights]
    └──enhances──> [Variety Optimization]

[Mark Round as Played]
    └──required by──> [Mid-Session Player Changes]  (need to know which rounds are unplayed)
    └──required by──> [Extend Session]
```

### Dependency Notes

- **Attendance Selection requires Member Roster:** You can only pick attendees from a pre-existing list; roster must be populated first.
- **Round Generation requires Attendance Selection:** The algorithm needs the confirmed player list before it can generate groupings.
- **Variety Optimization requires Round Generation:** It is the scoring layer on top of candidate generation, not a separate feature.
- **Mid-Session Player Changes requires Mark Round as Played:** The system must know which rounds are already done to only regenerate future rounds.
- **Multi-Club Support enhances Member Roster:** Each club gets its own isolated member list; the structure is a pre-condition for multi-club to be meaningful.
- **Top-N Schedule Alternatives requires Round Generation:** It is the same generation process run K times with results ranked and surfaced for human selection.

---

## MVP Definition

### Launch With (v1)

Minimum viable — covers the complete practice session workflow for a single club.

- [ ] Member roster management — add, remove, rename players per club
- [ ] Single-club support — one club, one roster (multi-club comes after)
- [ ] Attendance selection at session start — tap to mark who is present
- [ ] Round generation with variety optimization — candidate + scoring algorithm
- [ ] Odd player handling — organizer chooses: sit-out rotation or 3-player court
- [ ] Round display — phone-optimized, court-by-court matchup view
- [ ] Mark round as played / advance to next round
- [ ] Set round count upfront; extend session on the fly

### Add After Validation (v1.x)

Add once the core session workflow is confirmed useful.

- [ ] Multi-club support — add when a second club is needed; the roster data model must accommodate it from the start even if the UI exposes only one club at launch
- [ ] View and choose from top-N generated schedules — add once organizers report wanting to override a generated schedule
- [ ] Mid-session player add/remove with round regeneration — add once the "someone showed up late" pain point is confirmed in real use

### Future Consideration (v2+)

Defer until there is evidence of demand.

- [ ] Tunable scoring weights (advanced settings screen) — low user-facing value until organizers ask for it; algorithm defaults should cover most cases
- [ ] Session history / past session review — useful for pattern analysis but no immediate organizer need during a live session
- [ ] PWA / installable app shell — improves mobile UX but adds build complexity; defer until usage justifies it

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Member roster management | HIGH | LOW | P1 |
| Attendance selection | HIGH | LOW | P1 |
| Round generation (2v2 groupings) | HIGH | MEDIUM | P1 |
| Variety optimization algorithm | HIGH | HIGH | P1 |
| Odd player handling | HIGH | MEDIUM | P1 |
| Round display (mobile-optimized) | HIGH | LOW | P1 |
| Mark round as played | HIGH | LOW | P1 |
| Set / extend round count | MEDIUM | LOW | P1 |
| Multi-club support | MEDIUM | LOW-MEDIUM | P2 |
| Top-N schedule alternatives | MEDIUM | MEDIUM | P2 |
| Mid-session player changes | HIGH | MEDIUM | P2 |
| Tunable scoring weights | LOW | LOW | P3 |
| Session history | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have; add in v1.x after core is validated
- P3: Nice to have; future consideration

---

## Competitor Feature Analysis

| Feature | Pickleheads | PlayMore | MatchUp | Our Approach |
|---------|-------------|----------|---------|--------------|
| Round generation | Yes (tournament) | Yes (social) | Yes (tournament) | Yes — practice-session focused |
| Variety optimization | Yes | AI-based | Systematic rotation | Candidate scoring; tunable weights |
| Odd player handling | Bye rotation | Not documented | Bye for 5/9 players | Organizer-chosen: sit-out or 3-player court |
| Mid-session changes | Matchup adjustment | Add/remove with one click | Limited post-generation | Regenerate unplayed rounds |
| Score tracking | Yes | Optional | Yes | No — deliberately excluded |
| Multi-club roster | No (single community) | No | No | Yes — core differentiator |
| Account required | Yes | Yes | Yes | No — zero friction |
| Works offline | No | No | No | Yes — localStorage + static SPA |
| Mobile-first | Partial | Yes (app) | Partial | Yes — phone-screen first, thumb-friendly |
| Top-N alternative schedules | No | No | No | Yes — differentiator |

---

## Sources

- [Pickleheads Round Robin Guide](https://www.pickleheads.com/guides/pickleball-round-robin) — organizer challenges and app feature set
- [Pickleheads Open Play Guide](https://www.pickleheads.com/guides/organize-pickleball-open-play) — open play pain points
- [PlayMore App](https://getplaymore.com/) — social session management feature set; mid-session add/remove
- [All-Play-All Round Robin App](https://www.allplayall.app/) — variety algorithm approach, odd player handling
- [MatchUp Tennis & Pickleball](https://www.matchuptennis.app/round-robin) — doubles rotation, odd player constraints
- [PlayTime Scheduler](https://playtimescheduler.com/) — pickleball-specific session scheduling, community management
- [Picklebeast Organizer Guide 2025](https://www.picklebeastpickleball.com/blog/round-robin-pickleball-leagues-guide) — organizer pain points: manual scheduling errors, variety complaints
- [PlayRez Round Robin Generator](https://playrez.com/tools/pickleball-round-robin-generator) — variety and balance in generated schedules
- [The Dink: Paddle Queuing and Rotation Methods](https://www.thedinkpickleball.com/the-best-paddle-queuing-and-rotation-methods-for-open-play-pickleball/) — open play rotation methods and organizer frustrations

---
*Feature research for: Pickleball Practice Session Scheduler SPA*
*Researched: 2026-04-02*
