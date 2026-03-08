export function isApproved(status: string | null | undefined): boolean {
  if (!status) return false;
  return status.trim().toLowerCase() === "approved";
}