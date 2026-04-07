/** Cross-route signal so Plans / Sessions / Exercises refetch counts when assign-package data changes. */

let version = 0;
const listeners = new Set<() => void>();

export function subscribeAssignmentCountsVersion(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getAssignmentCountsVersion(): number {
  return version;
}

export function bumpAssignmentCountsVersion(): void {
  version += 1;
  listeners.forEach((fn) => fn());
}
