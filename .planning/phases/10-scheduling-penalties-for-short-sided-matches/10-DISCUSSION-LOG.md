# Phase 10: Scheduling Penalties for Short-Sided Matches - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 10-scheduling-penalties-for-short-sided-matches
**Areas discussed:** Penalty application model, Default values and slider ranges, Settings UI grouping, Reset Defaults behavior

---

## Penalty Application Model

| Option | Description | Selected |
|--------|-------------|----------|
| Scaled — count + streak | Same model as partner/opponent penalties: base * 2^streak. First short-sided match adds a small push; repeats compound. | ✓ |
| Flat — binary flag | If player had any short-sided match this session, add penalty value once (no scaling). | |
| Count only — no streak | Penalty = base * count. Scales with frequency but no exponential streak. | |

**User's choice:** Scaled — count + streak (recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Short-sided player only | Only the player(s) on the short team receive the penalty. Solo in 3-way, both players in singles. | ✓ |
| Whole court | All players on a short-sided court take the penalty. | |

**User's choice:** Short-sided player only (recommended)

---

## Default Values and Slider Ranges

| Question | Options presented | Selected |
|----------|-------------------|----------|
| Singles default | 5, **10** (Recommended), 15 | 15 (user typed) |
| 3-way solo default | **10** (Recommended), 15, 5 | 20 (user typed) |
| 3-way pair default | **5** (Recommended), 10, 3 | 15 (user typed) |
| Slider range | **1–50** (same as existing), 0–50, 1–100 | 1–50 (same as existing) |

**Notes:** User set all three defaults meaningfully higher than the existing defaults (5/10/3), indicating a strong preference for these penalties to be felt. The solo penalty (20) is highest.

---

## Settings UI Grouping

| Option | Description | Selected |
|--------|-------------|----------|
| Same section, separate subsection label | Existing Scheduler Optimization card, add "Short-Sided Matches" header between old and new sliders. | ✓ |
| Same section, no separator | Add 3 new sliders after existing 3, no header. | |
| New separate section | New card below Scheduler Optimization. | |

**User's choice:** Same section, separate subsection label (recommended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Short-Sided Matches | Plain, describes what the penalties apply to. | ✓ |
| Fairness: Short-Sided Matches | Echoes the scheduler's fairness goal. | |

**User's choice:** "Short-Sided Matches" (recommended)

---

## Reset Defaults Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — reset all 6 sliders | Consistent behavior: all scheduling weights reset including new ones. | ✓ |
| No — only reset original 3 | Preserves short-sided penalty customization separately. | |

**User's choice:** Yes — reset all 6 sliders (recommended)

---

## Claude's Discretion

- Exact key names for new penalty fields in settings
- Exact history field names for new short-sided tracking in buildPairHistory()
- Exact hint text wording under each new slider
- Whether to add the "Short-Sided Matches" header as a `<p>` or `<h3>` element

## Deferred Ideas

None — discussion stayed within phase scope.
