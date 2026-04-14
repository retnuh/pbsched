import { expect, test, describe } from 'vitest'
import { buildPairHistory, scoreRound, generateRounds } from './scheduler.js'

const MOCK_SETTINGS = {
  penaltyRepeatedPartner: 5,
  penaltyRepeatedOpponent: 10,
  penaltyRepeatedSitOut: 3,
  candidateCount: 100,
};

describe('Scheduler Logic', () => {
  const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];

  test('buildPairHistory correctly counts partnerships', () => {
    const played = [
      {
        index: 0,
        courts: [{ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }],
        sittingOut: ['p5'],
        played: true
      }
    ];
    const history = buildPairHistory(played);
    
    // keys should be sorted internally
    expect(history.partnerCount['p1']['p2']).toBe(1);
    expect(history.partnerCount['p2']?.[ 'p1']).toBeUndefined(); 
    expect(history.opponentCount['p1']['p3']).toBe(1);
    expect(history.sitOutCount['p5']).toBe(1);
  });

  test('scoreRound penalizes repeats', () => {
    const history = {
      partnerCount: { 'p1': { 'p2': 1 } },
      partnerStreak: { 'p1': { 'p2': 1 } },
      opponentCount: { 'p1': { 'p3': 0 }, 'p1': { 'p4': 0 }, 'p2': { 'p3': 0 }, 'p2': { 'p4': 0 } },
      opponentStreak: { 'p1': { 'p3': 0 }, 'p1': { 'p4': 0 }, 'p2': { 'p3': 0 }, 'p2': { 'p4': 0 } },
      sitOutCount: {},
      sitOutStreak: {}
    };
    
    const candidateWithRepeat = {
      courts: [{ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }],
      sittingOut: []
    };
    
    const candidateWithoutRepeat = {
      courts: [{ teamA: ['p1', 'p3'], teamB: ['p2', 'p4'] }],
      sittingOut: []
    };

    // p1-p2 streak is 1, so penalty is 5 * 2^1 = 10
    const score1 = scoreRound(candidateWithRepeat, history, MOCK_SETTINGS);
    const score2 = scoreRound(candidateWithoutRepeat, history, MOCK_SETTINGS);

    expect(score1).toBe(10);
    expect(score2).toBe(0);
  });

  test('generateRounds handles 8 players (even count)', () => {
    const rounds = generateRounds(players, [], 2, MOCK_SETTINGS);
    expect(rounds).toHaveLength(2);
    expect(rounds[0].courts).toHaveLength(2);
    expect(rounds[0].sittingOut).toHaveLength(0);
  });

  test('generateRounds handles 7 players — 2v1 court, nobody sits out', () => {
    const sevenPlayers = players.slice(0, 7);
    const rounds = generateRounds(sevenPlayers, [], 1, MOCK_SETTINGS);
    // 7 = 1 court of 4 + 1 court of 3 (2v1)
    expect(rounds[0].courts).toHaveLength(2);
    expect(rounds[0].courts.some(c => c.teamB.length === 1)).toBe(true);
    expect(rounds[0].sittingOut).toHaveLength(0);
  });

  test('generateRounds handles 10 players — 1v1 court, nobody sits out', () => {
    const tenPlayers = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
    const rounds = generateRounds(tenPlayers, [], 1, MOCK_SETTINGS);
    // 10 = 2 courts of 4 + 1 court of 2 (1v1)
    expect(rounds[0].courts).toHaveLength(3);
    expect(rounds[0].courts.filter(c => c.teamA.length === 1 && c.teamB.length === 1)).toHaveLength(1);
    expect(rounds[0].sittingOut).toHaveLength(0);
  });

  test('generateRounds handles 9 players — 1 sits out', () => {
    const ninePlayers = players.slice(0, 8).concat(['p9']);
    const rounds = generateRounds(ninePlayers, [], 1, MOCK_SETTINGS);
    // 9 = 2 courts of 4 + 1 sits out
    expect(rounds[0].courts).toHaveLength(2);
    expect(rounds[0].sittingOut).toHaveLength(1);
  });

  test('scoreRound applies exponential penalties for back-to-back repeats', () => {
    // Round 1: p1 and p2 are partners. Opponents p3, p4.
    const played = [{
      index: 0,
      courts: [{ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }],
      sittingOut: [],
      played: true
    }];
    const history1 = buildPairHistory(played);
    
    // Candidate for Round 2: p1 and p2 are partners again (streak = 1)
    // Use fresh opponents (p5, p6) so only p1-p2 penalty applies
    const candidate = {
      courts: [{ teamA: ['p1', 'p2'], teamB: ['p5', 'p6'] }],
      sittingOut: []
    };
    
    // Penalty should be base * 2^1 = 10
    const score1 = scoreRound(candidate, history1, MOCK_SETTINGS);
    expect(score1).toBe(10);

    // Round 2: p1 and p2 are partners again. Opponents p5, p6.
    played.push({
      index: 1,
      courts: [{ teamA: ['p1', 'p2'], teamB: ['p5', 'p6'] }],
      sittingOut: [],
      played: true
    });
    const history2 = buildPairHistory(played);
    
    // Candidate for Round 3: p1 and p2 are partners a THIRD time (streak = 2)
    // Use fresh opponents (p7, p8) so only p1-p2 penalty applies
    const candidate3 = {
      courts: [{ teamA: ['p1', 'p2'], teamB: ['p7', 'p8'] }],
      sittingOut: []
    };
    
    // Penalty should be base * 2^2 = 20
    const score2 = scoreRound(candidate3, history2, MOCK_SETTINGS);
    expect(score2).toBe(20);
  });

  test('scoreRound penalizes 2nd BYE much more than repeated partnership', () => {
    const history = {
      partnerCount: { 'p1': { 'p2': 1 } },
      partnerStreak: { 'p1': { 'p2': 1 } }, // p1 and p2 were partners last round
      opponentCount: {},
      opponentStreak: {},
      sitOutCount: { 'p3': 1 },
      sitOutStreak: { 'p3': 0 } // p3 sat out once before, but not last round
    };

    // Candidate A: p1 and p2 partner again (streak 1)
    const candidateA = {
      courts: [{ teamA: ['p1', 'p2'], teamB: ['p4', 'p5'] }],
      sittingOut: ['p6']
    };

    // Candidate B: p3 sits out a second time
    const candidateB = {
      courts: [{ teamA: ['p1', 'p4'], teamB: ['p2', 'p5'] }],
      sittingOut: ['p3']
    };

    const scoreA = scoreRound(candidateA, history, MOCK_SETTINGS);
    const scoreB = scoreRound(candidateB, history, MOCK_SETTINGS);

    // scoreA should be roughly 5 * 2^1 = 10
    // scoreB should be roughly 3 * 100^1 = 300
    expect(scoreA).toBe(10);
    expect(scoreB).toBeGreaterThan(scoreA);
    expect(scoreB).toBe(303); // 3 * 100^1 + 3 * 2^0
  });

  test('variety improves over multiple rounds', () => {
    // Generate 5 rounds for 8 players
    // We expect the scheduler to avoid putting p1 and p2 together every time
    let played = [];
    for (let i = 0; i < 5; i++) {
      const next = generateRounds(players, played, 1, MOCK_SETTINGS);
      played = [...played, ...next];
    }

    const history = buildPairHistory(played);
    
    // p1 should not have p2 as partner in all 5 rounds
    // Total partnership opportunities for p1 is 5 rounds. 
    // If it were random, they'd partner ~1.4 times (5 * 1/7).
    // If variety optimization works, it should be 1 or 2 max.
    Object.values(history.partnerCount['p1'] || {}).forEach(count => {
      expect(count).toBeLessThan(3); 
    });
  });
});
