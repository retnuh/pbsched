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
      settings: { 
        oddPlayerFallback: 'three-player-court', // Force smart default (2v1)
        ...settings 
      }
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
    const [nextRound] = generateRounds(
      session.attendeeIds, 
      playedRounds, 
      1, 
      session.settings
    );

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
      session.rounds = session.rounds.filter(r => r.played || r.index <= roundIndex);
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
   * Updates settings for the active session (e.g. odd player fallback).
   * If strategy changes, it tries to reconfigure the current unplayed round 
   * without a full randomization of standard courts.
   */
  updateSettings(updates) {
    const session = this.getActiveSession();
    if (!session) return;

    const oldStrat = session.settings.oddPlayerFallback;
    session.settings = { ...session.settings, ...updates };
    const newStrat = session.settings.oddPlayerFallback;

    if (oldStrat !== newStrat) {
      const currentRoundIdx = session.rounds.length - 1;
      const round = session.rounds[currentRoundIdx];
      
      if (round && !round.played) {
        // Try to morph the round instead of a full regenerate
        this.morphRoundStrategy(round, session.attendeeIds, session.settings);
      }
    }

    this.updateSession(session);
  },

  /**
   * Morphs a round to a new strategy while preserving standard 4-player courts.
   */
  morphRoundStrategy(round, attendeeIds, settings) {
    const num4Packs = Math.floor(attendeeIds.length / 4);
    const oddCount = attendeeIds.length % 4;
    if (oddCount === 0) return; // Nothing to morph

    // 1. Identify standard courts (full 2v2) vs extra court
    const standardCourts = round.courts.filter(c => c.teamA.length === 2 && c.teamB.length === 2);
    const extraCourt = round.courts.find(c => c.teamA.length < 2 || c.teamB.length < 2);
    
    // 2. Identify all players involved in the "remainder" (extra court + sitters)
    let leftoverPlayers = [...round.sittingOut];
    if (extraCourt) {
      leftoverPlayers = [...leftoverPlayers, ...extraCourt.teamA, ...extraCourt.teamB];
    }

    // 3. Re-assign standard courts if for some reason we have the wrong number
    // (This shouldn't happen with our logic, but keeps it safe)
    if (standardCourts.length !== num4Packs) {
      this.regenerateRound(round.index);
      return;
    }

    // 4. Re-configure the leftover players based on new strategy
    const strat = settings.oddPlayerFallback;
    const newExtraCourts = [];
    let newSitOut = [];

    // Shuffle leftovers slightly to ensure fair pick if dropping from 2v1 -> 1v1
    leftoverPlayers.sort(() => Math.random() - 0.5);

    if (strat === 'three-player-court' && oddCount === 3) {
      newExtraCourts.push({
        teamA: [leftoverPlayers[0], leftoverPlayers[1]],
        teamB: [leftoverPlayers[2]]
      });
    } else if (strat === 'two-player-court' && oddCount >= 2) {
      newExtraCourts.push({
        teamA: [leftoverPlayers[0]],
        teamB: [leftoverPlayers[1]]
      });
      newSitOut = leftoverPlayers.slice(2);
    } else {
      // sit-out
      newSitOut = leftoverPlayers;
    }

    round.courts = [...standardCourts, ...newExtraCourts];
    round.sittingOut = newSitOut;
  },

  /**
   * Returns top N alternative candidates for the next round slot.
   */
  getAlternativeRounds(n = 3, roundIndex = null) {
    const session = this.getActiveSession();
    if (!session) return [];

    const playedRounds = session.rounds.filter(r => r.played);
    
    // If we're looking for alternatives for an unplayed round that might have forced sit-outs
    let forcedSitOutIds = null;
    if (roundIndex !== null && session.rounds[roundIndex] && !session.rounds[roundIndex].played) {
      forcedSitOutIds = session.rounds[roundIndex].sittingOut;
    }

    return getTopAlternatives(
      session.attendeeIds,
      playedRounds,
      session.settings,
      n,
      forcedSitOutIds
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

  updateSession(updatedSession) {
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
