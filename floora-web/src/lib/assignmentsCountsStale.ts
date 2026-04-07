import { bumpAssignmentCountsVersion } from "./assignmentCountsVersionStore";

const STORAGE_KEY = "floora_refresh_assignment_counts";

/** Call after assign-package mutations so dashboard lists refetch counts when the user comes back. */
export function markAssignmentCountsStale(): void {
  bumpAssignmentCountsVersion();
  try {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* private mode / quota */
  }
}

export function consumeAssignmentCountsStale(): boolean {
  try {
    if (sessionStorage.getItem(STORAGE_KEY) == null) return false;
    sessionStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
