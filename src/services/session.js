import { StorageAdapter } from '../storage.js';
import { generateRounds, getTopAlternatives } from '../scheduler.js';
import { ClubService } from './club.js';

/**
 * SessionService
 * Manages the lifecycle of practice sessions.
 */

export const SessionService = {
  getSessions() {
    return StorageAdapter.get('sessions') || [];
  },

  getActiveSession() {
    return this.getSessions().find(s => s.status === 'active');
  },

  createSession(clubId, attendeeIds) {
    // Close any existing active session first
    this.closeActiveSession();

    const settings = StorageAdapter.get('settings');
    const createdAt = new Date().toISOString();
    const newSession = {
      id: crypto.randomUUID(),
      clubId,
      createdAt,
      status: 'active',
      attendeeIds,
      rounds: [],
      settings: { ...settings }
    };

    // Update member recency
    ClubService.updateMembersLastPlayed(clubId, attendeeIds, createdAt);

    const sessions = this.getSessions();
    sessions.push(newSession);
    StorageAdapter.set('sessions', sessions);
    return newSession;
  },

  closeActiveSession() {
    const sessions = this.getSessions();
    const active = sessions.find(s => s.status === 'active');
    if (active) {
      active.status = 'closed';
      StorageAdapter.set('sessions', sessions);
    }
  },

  /**
   * Generates the next round for the active session.
   */
  generateNextRound() {
    const session = this.getActiveSession();
    if (!session) return null;

    const playedRounds = session.rounds.filter(r => r.played);
    const results = generateRounds(
      session.attendeeIds,
      playedRounds,
      1,
      session.settings
    );

    if (!results.length) return null;

    const [nextRound] = results;
    session.rounds.push(nextRound);
    this.updateSession(session);
    return nextRound;
  },

  markRoundPlayed(roundIndex) {
    const session = this.getActiveSession();
    if (session && session.rounds[roundIndex]) {
      session.rounds[roundIndex].played = true;
      this.updateSession(session);
    }
  },

  markRoundUnplayed(roundIndex) {
    const session = this.getActiveSession();
    if (session && session.rounds[roundIndex]) {
      session.rounds[roundIndex].played = false;
      this.updateSession(session);
    }
  },

  /**
   * Deletes all unplayed rounds following a specific index.
   * Useful when undoing a round to clear the 'next' round that was auto-generated.
   */
  deleteUnplayedRoundsAfter(roundIndex) {
    const session = this.getActiveSession();
    if (session) {
      session.rounds = session.rounds.filter((r, i) => r.played || i <= roundIndex);
      this.updateSession(session);
    }
  },

  /**
   * Updates the list of attendees for the active session mid-session.
   */
  updateAttendees(newAttendeeIds) {
    const session = this.getActiveSession();
    if (session) {
      session.attendeeIds = newAttendeeIds;
      this.updateSession(session);
    }
  },

  /**
   * Updates settings for the active session and regenerates the current unplayed round.
   * Called when penalty sliders change so the live round reflects the new weights.
   */
  updateSettings(updates) {
    const session = this.getActiveSession();
    if (!session) return;

    session.settings = { ...session.settings, ...updates };

    const currentRoundIdx = session.rounds.length - 1;
    const round = session.rounds[currentRoundIdx];
    if (round && !round.played) {
      this.regenerateRound(currentRoundIdx);
    }

    this.updateSession(session);
  },

  /**
   * Returns top N alternative candidates for the next round slot.
   */
  getAlternativeRounds(n = 3) {
    const session = this.getActiveSession();
    if (!session) return [];

    const playedRounds = session.rounds.filter(r => r.played);

    return getTopAlternatives(
      session.attendeeIds,
      playedRounds,
      session.settings,
      n
    );
  },

  /**
   * Regenerates a specific unplayed round.
   * Can optionally force specific players to sit out.
   */
  regenerateRound(roundIndex, forcedSitOutIds = null) {
    const session = this.getActiveSession();
    if (session && session.rounds[roundIndex] && !session.rounds[roundIndex].played) {
      const playedRounds = session.rounds.slice(0, roundIndex).filter(r => r.played);
      
      // If we have forced sit-outs, we remove them from the pool before generating
      const activeAttendees = forcedSitOutIds 
        ? session.attendeeIds.filter(id => !forcedSitOutIds.includes(id))
        : session.attendeeIds;

      const [newRound] = generateRounds(
        activeAttendees,
        playedRounds,
        1,
        session.settings
      );

      // Add the forced players back into the sittingOut array
      if (forcedSitOutIds) {
        newRound.sittingOut = [...newRound.sittingOut, ...forcedSitOutIds];
      }

      newRound.index = roundIndex;
      session.rounds[roundIndex] = newRound;
      this.updateSession(session);
      return newRound;
    }
    return null;
  },

  /**
   * Replaces an unplayed round with an alternative candidate.
   */
  replaceRound(roundIndex, newRound) {
    const session = this.getActiveSession();
    if (session && session.rounds[roundIndex] && !session.rounds[roundIndex].played) {
      session.rounds[roundIndex] = newRound;
      this.updateSession(session);
    }
  },

  /**
   * Updates a round with editor-supplied assignments.
   *
   * Unplayed round (HIST-01, per D-02): replaces assignments in place, no subsequent regeneration.
   * Played round (HIST-02, HIST-03, per D-01, D-03):
   *   - marks round with source: 'edited' (played: true preserved)
   *   - deletes all subsequent unplayed rounds
   *   - persists FIRST, then calls generateNextRound (generateNextRound reads from storage)
   *
   * NOTE (11-M-01): QuotaExceededError is swallowed by StorageAdapter.set. On storage-full failures
   * the in-memory state will appear correct, but the data will revert on hard refresh since it was
   * never persisted.
   *
   * NOTE (11-M-02): This method always calls generateNextRound() after a played-round edit,
   * creating a new unplayed round even if the session was at its natural end.
   */
  updateRound(roundIndex, updatedRound) {
    const session = this.getActiveSession();
    if (!session) return false;
    if (roundIndex < 0 || !session.rounds[roundIndex]) return false;

    const round = session.rounds[roundIndex];

    if (round.played) {
      // HIST-02: mark as edited; preserve played: true (D-03)
      session.rounds[roundIndex] = { ...updatedRound, played: true, source: 'edited', index: roundIndex };

      // HIST-03: inline-delete subsequent unplayed rounds
      // (not delegating to deleteUnplayedRoundsAfter — that method has its own updateSession call)
      session.rounds = session.rounds.filter((r, i) => r.played || i <= roundIndex);

      // Persist BEFORE generateNextRound — generateNextRound reads from localStorage (D-01)
      this.updateSession(session);

      // Regenerate next round using updated played-round history
      this.generateNextRound();
    } else {
      // HIST-01: replace unplayed round in place (D-02)
      // Explicitly omit 'source' to prevent caller-supplied source from leaking in
      const { source: _omit, ...rest } = updatedRound;
      session.rounds[roundIndex] = { ...rest, index: roundIndex };
      this.updateSession(session);
    }
    return true;
  },

  updateSession(updatedSession) {
    // Re-stamp index to match array position before persisting (WR-02: keeps r.index in sync)
    updatedSession.rounds = updatedSession.rounds.map((r, i) => ({ ...r, index: i }));
    const sessions = this.getSessions();
    const idx = sessions.findIndex(s => s.id === updatedSession.id);
    if (idx !== -1) {
      sessions[idx] = updatedSession;
      StorageAdapter.set('sessions', sessions);
    }
  },

  deleteSession(id) {
    const sessions = this.getSessions().filter(s => s.id !== id);
    StorageAdapter.set('sessions', sessions);
  }
};
