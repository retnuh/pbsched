/**
 * Versioned StorageAdapter for localStorage persistence.
 * Handles schema migrations and safe read/write operations.
 */

const STORAGE_PREFIX = 'pb:';
const SCHEMA_VERSION = 1;

/**
 * Migration chain for the application state.
 * Each version key maps to a function that migrates the state from (v-1) to v.
 */
const migrations = {
  /**
   * Initial schema setup (v1)
   */
  1: (data) => {
    return {
      ...data,
      clubs: data.clubs || [],
      sessions: data.sessions || [],
      settings: data.settings || {
        penaltyRepeatedPartner: 5,
        penaltyRepeatedOpponent: 10,
        penaltyRepeatedSitOut: 3,
        candidateCount: 200,
        topNToShow: 3,
        oddPlayerFallback: 'three-player-court',
      },
      schemaVersion: 1,
    };
  },
};

/**
 * Recursively applies migrations to reach the current schema version.
 */
function migrate(data) {
  const currentVersion = data.schemaVersion || 0;
  if (currentVersion >= SCHEMA_VERSION) return data;

  const nextVersion = currentVersion + 1;
  const migrateFn = migrations[nextVersion];

  if (!migrateFn) {
    console.warn(`No migration found for version ${nextVersion}. Data may be stale.`);
    return data;
  }

  console.info(`Migrating storage: v${currentVersion} -> v${nextVersion}`);
  return migrate(migrateFn(data));
}

/**
 * Loads all app data, runs migrations, and persists the result.
 */
function initStorage() {
  const rawData = localStorage.getItem(`${STORAGE_PREFIX}all`);
  let data = rawData ? JSON.parse(rawData) : { schemaVersion: 0 };

  data = migrate(data);
  saveAll(data);
  return data;
}

/**
 * Persists the entire application state.
 */
function saveAll(data) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}all`, JSON.stringify(data));
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
      console.error('LocalStorage quota exceeded. Data may not be saved.');
      // Optional: Surface this to the user via a global notification system later.
    } else {
      throw e;
    }
  }
}

/**
 * Internal state for the current session.
 */
let state = initStorage();

/**
 * StorageAdapter Public API
 */
export const StorageAdapter = {
  get(key) {
    return state[key];
  },

  set(key, value) {
    state[key] = value;
    saveAll(state);
  },

  /**
   * Resets all application data to default values.
   */
  reset() {
    state = { schemaVersion: 0 };
    state = migrate(state);
    saveAll(state);
  },

  getRawState() {
    return state;
  },

  /**
   * Overwrites the entire application state from a JSON object.
   * Runs migrations to ensure compatibility.
   */
  importData(data) {
    state = migrate(data);
    saveAll(state);
    return state;
  }
};
