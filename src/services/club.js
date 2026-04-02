import { StorageAdapter } from '../storage.js';

/**
 * ClubService
 * Handles CRUD for clubs and their member rosters.
 */

export const ClubService = {
  getClubs() {
    return StorageAdapter.get('clubs') || [];
  },

  getClub(id) {
    return this.getClubs().find(c => c.id === id);
  },

  createClub(name) {
    const clubs = this.getClubs();
    const newClub = {
      id: crypto.randomUUID(),
      name: name,
      members: [],
      createdAt: new Date().toISOString()
    };
    clubs.push(newClub);
    StorageAdapter.set('clubs', clubs);
    return newClub;
  },

  updateClub(id, updates) {
    const clubs = this.getClubs();
    const idx = clubs.findIndex(c => c.id === id);
    if (idx !== -1) {
      clubs[idx] = { ...clubs[idx], ...updates };
      StorageAdapter.set('clubs', clubs);
    }
  },

  deleteClub(id) {
    const clubs = this.getClubs().filter(c => c.id !== id);
    StorageAdapter.set('clubs', clubs);
  },

  // Member Management
  addMember(clubId, name) {
    const clubs = this.getClubs();
    const clubIdx = clubs.findIndex(c => c.id === clubId);
    if (clubIdx !== -1) {
      const newMember = {
        id: crypto.randomUUID(),
        name
      };
      clubs[clubIdx].members.push(newMember);
      StorageAdapter.set('clubs', clubs);
      return newMember;
    }
  },

  removeMember(clubId, memberId) {
    const clubs = this.getClubs();
    const clubIdx = clubs.findIndex(c => c.id === clubId);
    if (clubIdx !== -1) {
      clubs[clubIdx].members = clubs[clubIdx].members.filter(m => m.id !== memberId);
      StorageAdapter.set('clubs', clubs);
    }
  },

  renameMember(clubId, memberId, newName) {
    const clubs = this.getClubs();
    const clubIdx = clubs.findIndex(c => c.id === clubId);
    if (clubIdx !== -1) {
      const membIdx = clubs[clubIdx].members.findIndex(m => m.id === memberId);
      if (membIdx !== -1) {
        clubs[clubIdx].members[membIdx].name = newName;
        StorageAdapter.set('clubs', clubs);
      }
    }
  },

  updateMembersLastPlayed(clubId, memberIds, timestamp) {
    const clubs = this.getClubs();
    const clubIdx = clubs.findIndex(c => c.id === clubId);
    if (clubIdx !== -1) {
      clubs[clubIdx].members.forEach(m => {
        if (memberIds.includes(m.id)) {
          m.lastPlayed = timestamp;
        }
      });
      StorageAdapter.set('clubs', clubs);
    }
  }
};
