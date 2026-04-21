export type PhaseTitle = "Restore" | "Retrain" | "Reclaim";

/**
 * Dashboard phases are 4-session bands:
 * 0–3 Restore, 4–7 Retrain, 8–11 Reclaim.
 *
 * We derive from the session's assignment order (unlock/order index).
 * If an API ever sends 1-based order_index, this still behaves well by
 * treating 1 as "first slot" (index 0) via the heuristic below.
 */
export function phaseTitleForOrderIndex(orderIndexRaw: unknown): PhaseTitle {
  const n = Number(orderIndexRaw);
  if (!Number.isFinite(n)) return "Restore";

  // Heuristic: if order index looks 1-based (first session is 1), normalize.
  const idx = n === 1 ? 0 : n;

  if (idx >= 8) return "Reclaim";
  if (idx >= 4) return "Retrain";
  return "Restore";
}

