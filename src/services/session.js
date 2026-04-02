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
   */
  updateSettings(updates) {
    const session = this.getActiveSession();
    if (session) {
      session.settings = { ...session.settings, ...updates };
      this.updateSession(session);
    }
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
