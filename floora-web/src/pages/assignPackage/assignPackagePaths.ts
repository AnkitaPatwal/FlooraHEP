/** Absolute paths under the app router (AssignPackage lives at `/assign-package/*`). */
export function assignPackageClientPath(userId: string): string {
  return `/assign-package/${encodeURIComponent(userId)}`;
}

export function assignPackageAssignmentSessionsPath(
  userId: string,
  assignmentId: string,
): string {
  return `${assignPackageClientPath(userId)}/assignment/${encodeURIComponent(assignmentId)}/sessions`;
}

/** Patient-specific session (module) detail: exercises & per-patient overrides. */
export function assignPackagePatientSessionPath(
  userId: string,
  assignmentId: string,
  moduleId: number | string,
): string {
  return `${assignPackageClientPath(userId)}/assignment/${encodeURIComponent(assignmentId)}/session/${encodeURIComponent(String(moduleId))}`;
}
