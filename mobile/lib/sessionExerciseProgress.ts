/**
 * Tracks which exercises in a module (session) the user has finished watching, in order.
 * Used so exercise 2 stays locked until exercise 1 has played to the end, etc.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

// Include assignmentId so a newly published plan starts fresh even when reusing the same module/video.
const storageKey = (userId: string, assignmentId: string, moduleId: number) =>
  `@session_exercise_max_completed:${userId}:${assignmentId}:${moduleId}`;

export async function getMaxCompletedExercisePosition(
  userId: string,
  assignmentId: string,
  moduleId: number
): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId, assignmentId, moduleId));
    if (raw == null || raw === "") return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Position is 1-based index in the session list. First exercise is position 1. */
export function isExercisePositionUnlocked(maxCompletedPosition: number, position: number): boolean {
  return position <= maxCompletedPosition + 1;
}

/**
 * Call when a video plays to the end. Only advances if `position` is the next allowed step.
 */
export async function recordExerciseWatchedToEnd(
  userId: string,
  assignmentId: string,
  moduleId: number,
  position: number
): Promise<void> {
  const max = await getMaxCompletedExercisePosition(userId, assignmentId, moduleId);
  if (position > max + 1) return;
  const next = Math.max(max, position);
  await AsyncStorage.setItem(storageKey(userId, assignmentId, moduleId), String(next));
}
