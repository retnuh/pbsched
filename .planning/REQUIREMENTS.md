# Requirements: Pickleball Practice Scheduler

**Defined:** 2026-04-02
**Core Value:** Generate fair, varied round matchups instantly — so the organizer can focus on running practice, not doing scheduling math in their head.

## v1 Requirements

### Clubs

- [x] **CLUB-01**: Organizer can create a new club with a name
- [x] **CLUB-02**: Organizer can rename an existing club
- [x] **CLUB-03**: Organizer can delete a club (with confirmation)
- [x] **CLUB-04**: Organizer can switch between clubs
- [ ] **CLUB-05**: Organizer can export a club's data as a JSON file
- [ ] **CLUB-06**: Organizer can import a club from a JSON file

### Members

- [x] **MEMB-01**: Organizer can add a member to a club by name
- [x] **MEMB-02**: Organizer can rename a member
- [x] **MEMB-03**: Organizer can remove a member from a club

### Sessions

- [x] **SESS-01**: Organizer can start a new session for the active club
- [x] **SESS-02**: Organizer can select which club members are attending a session
- [ ] **SESS-03**: Organizer can add a player to an in-progress session (late arrival)
- [ ] **SESS-04**: Organizer can remove a player from an in-progress session (early departure)
- [ ] **SESS-05**: Adding or removing a player auto-regenerates all remaining (unplayed) rounds

### Round Generation

- [x] **RGEN-01**: Organizer can generate the next round on demand (open-ended, no fixed count)
- [x] **RGEN-02**: App auto-selects the highest-scoring candidate matchup by default
- [ ] **RGEN-03**: Organizer can view top alternative matchup candidates and choose one instead
- [x] **RGEN-04**: When player count is not divisible by 4, organizer is prompted to choose a fallback (sit someone out or use a 3-player court)
- [x] **RGEN-05**: Organizer can mark a round as played, advancing session history
- [x] **RGEN-06**: Scoring penalizes repeated partner and opponent pairings across all played rounds in the session

### Settings

- [ ] **SETT-01**: Organizer can view and edit the scoring penalty weights (repeated partner, repeated opponent, bye frequency)
- [ ] **SETT-02**: Organizer can set a default odd-player policy per club (sit out / 3-player court) to skip the per-round prompt
- [x] **SETT-03**: Organizer can reset all app data with a confirmation step

### Developer Productivity

- [x] **DEVP-01**: Project includes a `justfile` with common developer targets (dev, test, build)

## v2 Requirements

### Session History

- **HIST-01**: Organizer can view a list of past sessions for a club
- **HIST-02**: Organizer can review the round matchups from a past session

### Deployment

- **DEPL-01**: App can be installed as a PWA (Add to Home Screen on iOS/Android)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Score tracking | Not needed — scheduling only for v1 |
| Court assignment | Organizer announces matchups verbally; court numbers don't matter |
| User accounts / authentication | Local-first, single-device; no backend |
| Real-time sync across devices | No server; one organizer runs the app |
| DUPR / rating integration | Out of scope for practice scheduling |
| Fixed round count target | Open-ended "next round" model is simpler and sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLUB-01 | P3-ROSTER | Done |
| CLUB-02 | P3-ROSTER | Done |
| CLUB-03 | P3-ROSTER | Done |
| CLUB-04 | P3-ROSTER | Done |
| CLUB-05 | P5-SESSION-ADV | Pending |
| CLUB-06 | P5-SESSION-ADV | Pending |
| MEMB-01 | P3-ROSTER | Done |
| MEMB-02 | P3-ROSTER | Done |
| MEMB-03 | P3-ROSTER | Done |
| SESS-01 | P4-SESSION-CORE | Done |
| SESS-02 | P4-SESSION-CORE | Done |
| SESS-03 | P5-SESSION-ADV | Pending |
| SESS-04 | P5-SESSION-ADV | Pending |
| SESS-05 | P5-SESSION-ADV | Partial (Logic Done) |
| RGEN-01 | P2-ALGORITHM | Done |
| RGEN-02 | P2-ALGORITHM | Done |
| RGEN-03 | P5-SESSION-ADV | Partial (Logic Done) |
| RGEN-04 | P2-ALGORITHM | Done |
| RGEN-05 | P4-SESSION-CORE | Done |
| RGEN-06 | P2-ALGORITHM | Done |
| SETT-01 | P6-POLISH | Pending |
| SETT-02 | P6-POLISH | Pending |
| SETT-03 | P6-POLISH | Done |
| DEVP-01 | P1-FOUNDATION | Done |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✅

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 after justfile addition*
