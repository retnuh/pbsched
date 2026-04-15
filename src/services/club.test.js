import { describe, test, expect, beforeEach } from 'vitest'
import { StorageAdapter } from '../storage.js'
import { ClubService } from './club.js'

describe('ClubService', () => {
  beforeEach(() => {
    StorageAdapter.reset()
  })

  test('getClubs returns empty array initially', () => {
    expect(ClubService.getClubs()).toEqual([])
  })

  test('createClub adds a club with name, id, members array, and createdAt', () => {
    const club = ClubService.createClub('Test Club')
    expect(club.name).toBe('Test Club')
    expect(club.id).toBeDefined()
    expect(club.members).toEqual([])
    expect(club.createdAt).toBeDefined()
    expect(ClubService.getClubs()).toHaveLength(1)
  })

  test('getClub returns the club by id', () => {
    const club = ClubService.createClub('Alpha')
    const found = ClubService.getClub(club.id)
    expect(found).toMatchObject({ name: 'Alpha', id: club.id })
  })

  test('updateClub changes the club name', () => {
    const club = ClubService.createClub('Old Name')
    ClubService.updateClub(club.id, { name: 'New Name' })
    expect(ClubService.getClub(club.id).name).toBe('New Name')
  })

  test('deleteClub removes the club from the list', () => {
    const club = ClubService.createClub('To Delete')
    ClubService.deleteClub(club.id)
    expect(ClubService.getClubs()).toHaveLength(0)
  })

  test('addMember adds member with name and id to the club', () => {
    const club = ClubService.createClub('Club')
    const member = ClubService.addMember(club.id, 'Alice')
    expect(member.name).toBe('Alice')
    expect(member.id).toBeDefined()
    expect(ClubService.getClub(club.id).members).toHaveLength(1)
  })

  test('removeMember removes the member by id', () => {
    const club = ClubService.createClub('Club')
    const member = ClubService.addMember(club.id, 'Alice')
    ClubService.removeMember(club.id, member.id)
    expect(ClubService.getClub(club.id).members).toHaveLength(0)
  })

  test('renameMember changes the member name', () => {
    const club = ClubService.createClub('Club')
    const member = ClubService.addMember(club.id, 'Alice')
    ClubService.renameMember(club.id, member.id, 'Alicia')
    expect(ClubService.getClub(club.id).members[0].name).toBe('Alicia')
  })

  test('updateMembersLastPlayed sets lastPlayed on listed members and leaves others unchanged', () => {
    const club = ClubService.createClub('Club')
    const m1 = ClubService.addMember(club.id, 'Alice')
    const m2 = ClubService.addMember(club.id, 'Bob')
    const ts = '2026-04-15T10:00:00.000Z'
    ClubService.updateMembersLastPlayed(club.id, [m1.id], ts)
    const updated = ClubService.getClub(club.id)
    expect(updated.members.find(m => m.id === m1.id).lastPlayed).toBe(ts)
    expect(updated.members.find(m => m.id === m2.id).lastPlayed).toBeUndefined()
  })

  // 17-HI-03: not-found branch tests
  test('addMember returns undefined for non-existent club', () => {
    expect(ClubService.addMember('no-such-club', 'Ghost')).toBeUndefined()
  })

  test('getClub returns undefined for non-existent id', () => {
    expect(ClubService.getClub('no-such-id')).toBeUndefined()
  })

  test('renameMember is a no-op for invalid memberId (member name unchanged)', () => {
    const club = ClubService.createClub('Club')
    ClubService.addMember(club.id, 'Alice')
    ClubService.renameMember(club.id, 'bad-member-id', 'Ghost')
    const found = ClubService.getClub(club.id)
    expect(found.members[0].name).toBe('Alice')
  })

  test('removeMember is a no-op for invalid clubId (no crash)', () => {
    expect(() => ClubService.removeMember('bad-club-id', 'any-id')).not.toThrow()
  })

  test('updateMembersLastPlayed is a no-op for invalid clubId (no crash)', () => {
    expect(() => ClubService.updateMembersLastPlayed('bad-club-id', ['p1'], '2026-01-01T00:00:00.000Z')).not.toThrow()
  })

  // 17-ME-02: updateClub on non-existent id is a no-op
  test('updateClub on a non-existent id is a no-op and returns undefined', () => {
    const result = ClubService.updateClub('no-such-id', { name: 'Ghost' })
    expect(result).toBeUndefined()
    expect(ClubService.getClubs()).toHaveLength(0)
  })

  // 17-LO-01: two clubs created in sequence get different ids
  test('two clubs created in sequence get different ids', () => {
    const c1 = ClubService.createClub('Alpha')
    const c2 = ClubService.createClub('Beta')
    expect(c1.id).not.toBe(c2.id)
  })
})
