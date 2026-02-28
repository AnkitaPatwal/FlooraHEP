export function getDisplayName(name?: string | null): string {
  const trimmed = (name ?? "").trim();
  return trimmed.length > 0 ? trimmed : "Client";
}