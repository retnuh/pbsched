/**
 * SchedulerService
 * Pure functions for generating and scoring pickleball matchups.
 * No I/O or side effects.
 */

/**
 * Analyzes played rounds to build a history of partnerships and oppositions,
 * including both total counts and consecutive streaks.
 */
export function buildPairHistory(playedRounds) {
  const history = {
    partnerCount: {}, // { playerA: { playerB: count } }
    opponentCount: {}, // { playerA: { playerB: count } }
    sitOutCount: {}, // { player: count }
    partnerStreak: {}, // { playerA: { playerB: streak } }
    opponentStreak: {}, // { playerA: { playerB: streak } }
    sitOutStreak: {}, // { player: streak }
    singlesCount: {}, // { player: count }
    singlesStreak: {}, // { player: streak }
    threeWaySoloCount: {}, // { player: count }
    threeWaySoloStreak: {}, // { player: streak }
    threeWayPairCount: {}, // { player: count }
    threeWayPairStreak: {}, // { player: streak }
  };

  const increment = (obj, p1, p2) => {
    const [a, b] = [p1, p2].sort();
    if (!obj[a]) obj[a] = {};
    obj[a][b] = (obj[a][b] || 0) + 1;
  };

  // 1. Calculate Total Counts
  playedRounds.forEach((round) => {
    round.sittingOut.forEach((p) => {
      history.sitOutCount[p] = (history.sitOutCount[p] || 0) + 1;
    });

    round.courts.forEach((court) => {
      const { teamA, teamB } = court;
      if (teamA.length === 2) {
        increment(history.partnerCount, teamA[0], teamA[1]);
      }
      if (teamB.length === 2) {
        increment(history.partnerCount, teamB[0], teamB[1]);
      }
      teamA.forEach((a) => teamB.forEach((b) => {
        increment(history.opponentCount, a, b);
      }));

      const isSingles = teamA.length === 1 && teamB.length === 1;
      const isThreeWay = teamA.length + teamB.length === 3 && !isSingles;

      if (isSingles) {
        [teamA[0], teamB[0]].forEach(p => {
          history.singlesCount[p] = (history.singlesCount[p] || 0) + 1;
        });
      }
      if (isThreeWay) {
        const soloSide = teamA.length === 1 ? teamA : teamB;
        const pairSide = teamA.length === 2 ? teamA : teamB;
        history.threeWaySoloCount[soloSide[0]] = (history.threeWaySoloCount[soloSide[0]] || 0) + 1;
        pairSide.forEach(p => {
          history.threeWayPairCount[p] = (history.threeWayPairCount[p] || 0) + 1;
        });
      }
    });
  });

  // 2. Calculate Streaks (Backwards from the most recent round)
  if (playedRounds.length === 0) return history;

  const players = new Set();
  playedRounds.forEach(r => {
    r.sittingOut.forEach(p => players.add(p));
    r.courts.forEach(c => {
      c.teamA.forEach(p => players.add(p));
      c.teamB.forEach(p => players.add(p));
    });
  });

  const playerList = Array.from(players).sort();

  // Initialize streaks
  playerList.forEach(p => {
    history.sitOutStreak[p] = 0;
    history.partnerStreak[p] = {};
    history.opponentStreak[p] = {};
    history.singlesStreak[p] = 0;
    history.threeWaySoloStreak[p] = 0;
    history.threeWayPairStreak[p] = 0;
  });

  // Helper to check relationship in a round
  const getRelationship = (round, p1, p2) => {
    const [a, b] = [p1, p2].sort();
    if (round.sittingOut.includes(a) && round.sittingOut.includes(b)) return 'both-sit';
    for (const court of round.courts) {
      const inA1 = court.teamA.includes(a);
      const inA2 = court.teamA.includes(b);
      const inB1 = court.teamB.includes(a);
      const inB2 = court.teamB.includes(b);
      
      if (inA1 && inA2) return 'partners';
      if (inB1 && inB2) return 'partners';
      if ((inA1 && inB2) || (inA2 && inB1)) return 'opponents';
    }
    return 'none';
  };

  for (let i = playedRounds.length - 1; i >= 0; i--) {
    const round = playedRounds[i];
    
    playerList.forEach((p, idx) => {
      // Sit out streak
      if (history.sitOutStreak[p] === (playedRounds.length - 1 - i)) {
        if (round.sittingOut.includes(p)) history.sitOutStreak[p]++;
      }

      const expectedStreak = playedRounds.length - 1 - i;

      // singles streak
      const inSingles = round.courts.some(c =>
        c.teamA.length === 1 && c.teamB.length === 1 &&
        (c.teamA.includes(p) || c.teamB.includes(p))
      );
      if (history.singlesStreak[p] === expectedStreak && inSingles) {
        history.singlesStreak[p]++;
      }

      // 3-way solo streak
      const inThreeWaySolo = round.courts.some(c => {
        const isThreeWay = c.teamA.length + c.teamB.length === 3 && !(c.teamA.length === 1 && c.teamB.length === 1);
        if (!isThreeWay) return false;
        const soloSide = c.teamA.length === 1 ? c.teamA : c.teamB;
        return soloSide.includes(p);
      });
      if (history.threeWaySoloStreak[p] === expectedStreak && inThreeWaySolo) {
        history.threeWaySoloStreak[p]++;
      }

      // 3-way pair streak
      const inThreeWayPair = round.courts.some(c => {
        const isThreeWay = c.teamA.length + c.teamB.length === 3 && !(c.teamA.length === 1 && c.teamB.length === 1);
        if (!isThreeWay) return false;
        const pairSide = c.teamA.length === 2 ? c.teamA : c.teamB;
        return pairSide.includes(p);
      });
      if (history.threeWayPairStreak[p] === expectedStreak && inThreeWayPair) {
        history.threeWayPairStreak[p]++;
      }

      for (let j = idx + 1; j < playerList.length; j++) {
        const other = playerList[j];
        const [a, b] = [p, other];
        
        const rel = getRelationship(round, a, b);
        const expectedStreak = playedRounds.length - 1 - i;

        if (rel === 'partners' && (history.partnerStreak[a][b] || 0) === expectedStreak) {
          history.partnerStreak[a][b] = (history.partnerStreak[a][b] || 0) + 1;
        }
        if (rel === 'opponents' && (history.opponentStreak[a][b] || 0) === expectedStreak) {
          history.opponentStreak[a][b] = (history.opponentStreak[a][b] || 0) + 1;
        }
      }
    });
  }

  return history;
}

/**
 * Scores a candidate round based on penalty weights and streak multipliers.
 * Lower score is better.
 */
export function scoreRound(round, history, settings) {
  let score = 0;

  // Standard penalty: base * 2^streak
  const getStandardPenalty = (base, count, streak) => {
    if (count === 0) return 0;
    return base * Math.pow(2, streak);
  };

  // Massive penalty for sit-outs: base * 100^count
  // This ensures 2nd BYE (count=1) is 100x more expensive than 1st.
  const getSitOutPenalty = (base, count, streak) => {
    if (count === 0) return 0;
    const countWeight = base * Math.pow(100, count);
    const streakWeight = base * Math.pow(2, streak);
    return countWeight + streakWeight;
  };

  const getSitOutCount = (p) => history.sitOutCount?.[p] || 0;
  const getSitOutStreak = (p) => history.sitOutStreak?.[p] || 0;

  const getPartnerCount = (p1, p2) => {
    const [a, b] = [p1, p2].sort();
    return history.partnerCount?.[a]?.[b] || 0;
  };
  const getPartnerStreak = (p1, p2) => {
    const [a, b] = [p1, p2].sort();
    return history.partnerStreak?.[a]?.[b] || 0;
  };

  const getOpponentCount = (p1, p2) => {
    const [a, b] = [p1, p2].sort();
    return history.opponentCount?.[a]?.[b] || 0;
  };
  const getOpponentStreak = (p1, p2) => {
    const [a, b] = [p1, p2].sort();
    return history.opponentStreak?.[a]?.[b] || 0;
  };

  // 1. Penalize sit outs
  round.sittingOut.forEach((p) => {
    score += getSitOutPenalty(settings.penaltyRepeatedSitOut, getSitOutCount(p), getSitOutStreak(p));
  });

  // 2. Penalize court matchups
  round.courts.forEach((court) => {
    const { teamA, teamB } = court;

    // Partners (penalize each partnership only once)
    if (teamA.length === 2) {
      score += getStandardPenalty(settings.penaltyRepeatedPartner, getPartnerCount(teamA[0], teamA[1]), getPartnerStreak(teamA[0], teamA[1]));
    }
    if (teamB.length === 2) {
      score += getStandardPenalty(settings.penaltyRepeatedPartner, getPartnerCount(teamB[0], teamB[1]), getPartnerStreak(teamB[0], teamB[1]));
    }

    // Opponents (penalize each unique (a, b) pairing only once)
    teamA.forEach((a) => {
      teamB.forEach((b) => {
        score += getStandardPenalty(settings.penaltyRepeatedOpponent, getOpponentCount(a, b), getOpponentStreak(a, b));
      });
    });
  });

  return score;
}

/**
 * Generates a single random candidate round for the given attendees.
 */
function generateCandidate(attendees, history, settings, index) {
  const shuffled = [...attendees].sort(() => Math.random() - 0.5);
  const round = {
    index,
    courts: [],
    sittingOut: [],
    played: false,
  };

  let playersToAssign = [...shuffled];

  // 1. Determine how many standard 4-player courts we can have
  const num4Packs = Math.floor(playersToAssign.length / 4);
  const oddCount = playersToAssign.length % 4;

  // 2. Assign standard 2v2 courts first
  for (let i = 0; i < num4Packs; i++) {
    const quad = playersToAssign.splice(0, 4);
    round.courts.push({
      teamA: [quad[0], quad[1]],
      teamB: [quad[2], quad[3]],
    });
  }

  // 3. Handle the remainder based on strategy
  if (oddCount > 0) {
    const strat = settings.oddPlayerFallback;

    if (strat === 'three-player-court' && oddCount === 3) {
      // Play 2v1
      const trio = playersToAssign.splice(0, 3);
      round.courts.push({
        teamA: [trio[0], trio[1]],
        teamB: [trio[2]],
      });
    } else if (strat === 'two-player-court' && oddCount >= 2) {
      // Play 1v1
      const duo = playersToAssign.splice(0, 2);
      round.courts.push({
        teamA: [duo[0]],
        teamB: [duo[1]],
      });
      // Remaining (if any, e.g. 3rd player) sits out
      round.sittingOut = [...round.sittingOut, ...playersToAssign];
    } else {
      // 'sit-out' strategy or no other choice (e.g. only 1 player left)
      round.sittingOut = [...round.sittingOut, ...playersToAssign];
    }
  }

  return round;
}

/**
 * Main entry point: Generates one or more rounds.
 */
export function generateRounds(attendees, playedRounds, countToGenerate, settings) {
  const allRounds = [...playedRounds];
  const currentHistory = buildPairHistory(playedRounds);

  for (let i = 0; i < countToGenerate; i++) {
    const roundIndex = allRounds.length;
    let bestCandidate = null;
    let bestScore = Infinity;

    for (let c = 0; c < settings.candidateCount; c++) {
      const candidate = generateCandidate(attendees, currentHistory, settings, roundIndex);
      const score = scoreRound(candidate, currentHistory, settings);

      if (score < bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    allRounds.push(bestCandidate);
    
    // Update history for the next round in this batch
    // (Local increment to avoid full rebuild)
    bestCandidate.sittingOut.forEach(p => {
      currentHistory.sitOutCount[p] = (currentHistory.sitOutCount[p] || 0) + 1;
    });
    bestCandidate.courts.forEach(court => {
      const { teamA, teamB } = court;
      const inc = (obj, p1, p2) => {
        if (!obj[p1]) obj[p1] = {};
        obj[p1][p2] = (obj[p1][p2] || 0) + 1;
      };
      if (teamA.length === 2) {
        inc(currentHistory.partnerCount, teamA[0], teamA[1]);
        inc(currentHistory.partnerCount, teamA[1], teamA[0]);
      }
      if (teamB.length === 2) {
        inc(currentHistory.partnerCount, teamB[0], teamB[1]);
        inc(currentHistory.partnerCount, teamB[1], teamB[0]);
      }
      teamA.forEach(a => teamB.forEach(b => {
        inc(currentHistory.opponentCount, a, b);
        inc(currentHistory.opponentCount, b, a);
      }));
    });
  }

  return allRounds.slice(playedRounds.length);
}

/**
 * Returns the top N alternative candidates for a single round slot.
 */
export function getTopAlternatives(attendees, playedRounds, settings, n = 3, forcedSitOutIds = null) {
  const history = buildPairHistory(playedRounds);
  const roundIndex = playedRounds.length;
  const candidates = [];

  const activeAttendees = forcedSitOutIds 
    ? attendees.filter(id => !forcedSitOutIds.includes(id))
    : attendees;

  for (let c = 0; c < settings.candidateCount * 2; c++) {
    const candidate = generateCandidate(activeAttendees, history, settings, roundIndex);
    
    // Add the forced players back into the sittingOut array
    if (forcedSitOutIds) {
      candidate.sittingOut = [...candidate.sittingOut, ...forcedSitOutIds];
    }

    const score = scoreRound(candidate, history, settings);
    candidates.push({ round: candidate, score });
  }

  return candidates
    .sort((a, b) => a.score - b.score)
    .slice(0, n);
}
