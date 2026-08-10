import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_PREFIX = "rate_limit_";

type RateLimitConfig = {
  /* max attempts allowed within the window */
  maxAttempts: number;
  /* window duration in milliseconds */
  windowMs: number;
};

type RateLimitRecord = {
  attempts: number[];
  lockedUntil: number | null;
};

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60 * 1000,
};

async function getRecord(key: string): Promise<RateLimitRecord> {
  try {
    const raw = await AsyncStorage.getItem(`${KEY_PREFIX}${key}`);
    if (!raw) {
      return { attempts: [], lockedUntil: null };
    }
    return JSON.parse(raw) as RateLimitRecord;
  } catch {
    return { attempts: [], lockedUntil: null };
  }
}

async function saveRecord(key: string, record: RateLimitRecord) {
  await AsyncStorage.setItem(`${KEY_PREFIX}${key}`, JSON.stringify(record));
}

/**
 * Checks whether an action is currently allowed.
 * Returns { allowed, retryAfterMs } ΓÇö if locked, retryAfterMs tells
 * the caller how long until they can try again.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const record = await getRecord(key);
  const now = Date.now();

  // If locked, check if the lock has expired
  if (record.lockedUntil && record.lockedUntil > now) {
    return { allowed: false, retryAfterMs: record.lockedUntil - now };
  }

  // Clear expired attempts
  const freshAttempts = record.attempts.filter(
    (t) => now - t < config.windowMs,
  );

  if (freshAttempts.length >= config.maxAttempts) {
    const lockMs = config.windowMs;
    await saveRecord(key, {
      attempts: freshAttempts,
      lockedUntil: now + lockMs,
    });
    return { allowed: false, retryAfterMs: lockMs };
  }

  return { allowed: true, retryAfterMs: 0 };
}

export async function recordAttempt(key: string) {
  const record = await getRecord(key);
  const now = Date.now();
  const freshAttempts = record.attempts.filter(
    (t) => now - t < DEFAULT_CONFIG.windowMs,
  );
  freshAttempts.push(now);
  await saveRecord(key, {
    attempts: freshAttempts,
    lockedUntil: record.lockedUntil,
  });
}

/**
 * clears all recorded attempts for a key (after successful login)
 */
export async function clearRateLimit(key: string) {
  try {
    await AsyncStorage.removeItem(`${KEY_PREFIX}${key}`);
  } catch {
    // safe to ignore
  }
}
