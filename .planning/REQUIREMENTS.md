# Requirements: Pickleball Practice Scheduler

**Defined:** 2026-04-02
**Core Value:** Generate fair, varied round matchups instantly — so the organizer can focus on running practice, not doing scheduling math in their head.

## v1 Requirements

### Clubs

- [ ] **CLUB-01**: Organizer can create a new club with a name
- [ ] **CLUB-02**: Organizer can rename an existing club
- [ ] **CLUB-03**: Organizer can delete a club (with confirmation)
- [ ] **CLUB-04**: Organizer can switch between clubs
- [ ] **CLUB-05**: Organizer can export a club's data as a JSON file
- [ ] **CLUB-06**: Organizer can import a club from a JSON file

### Members

- [ ] **MEMB-01**: Organizer can add a member to a club by name
- [ ] **MEMB-02**: Organizer can rename a member
- [ ] **MEMB-03**: Organizer can remove a member from a club

### Sessions

- [ ] **SESS-01**: Organizer can start a new session for the active club
- [ ] **SESS-02**: Organizer can select which club members are attending a session
- [ ] **SESS-03**: Organizer can add a player to an in-progress session (late arrival)
- [ ] **SESS-04**: Organizer can remove a player from an in-progress session (early departure)
- [ ] **SESS-05**: Adding or removing a player auto-regenerates all remaining (unplayed) rounds

### Round Generation

- [ ] **RGEN-01**: Organizer can generate the next round on demand (open-ended, no fixed count)
- [ ] **RGEN-02**: App auto-selects the highest-scoring candidate matchup by default
- [ ] **RGEN-03**: Organizer can view top alternative matchup candidates and choose one instead
- [ ] **RGEN-04**: When player count is not divisible by 4, organizer is prompted to choose a fallback (sit someone out or use a 3-player court)
- [ ] **RGEN-05**: Organizer can mark a round as played, advancing session history
- [ ] **RGEN-06**: Scoring penalizes repeated partner and opponent pairings across all played rounds in the session

### Settings

- [ ] **SETT-01**: Organizer can view and edit the scoring penalty weights (repeated partner, repeated opponent, bye frequency)
- [ ] **SETT-02**: Organizer can set a default odd-player policy per club (sit out / 3-player court) to skip the per-round prompt
- [ ] **SETT-03**: Organizer can reset all app data with a confirmation step

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
| CLUB-01 | — | Pending |
| CLUB-02 | — | Pending |
| CLUB-03 | — | Pending |
| CLUB-04 | — | Pending |
| CLUB-05 | — | Pending |
| CLUB-06 | — | Pending |
| MEMB-01 | — | Pending |
| MEMB-02 | — | Pending |
| MEMB-03 | — | Pending |
| SESS-01 | — | Pending |
| SESS-02 | — | Pending |
| SESS-03 | — | Pending |
| SESS-04 | — | Pending |
| SESS-05 | — | Pending |
| RGEN-01 | — | Pending |
| RGEN-02 | — | Pending |
| RGEN-03 | — | Pending |
| RGEN-04 | — | Pending |
| RGEN-05 | — | Pending |
| RGEN-06 | — | Pending |
| SETT-01 | — | Pending |
| SETT-02 | — | Pending |
| SETT-03 | — | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 0 (filled by roadmap)
- Unmapped: 23 ⚠️

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 after initial definition*
