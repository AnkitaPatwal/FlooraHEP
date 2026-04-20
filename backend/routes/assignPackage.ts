import { Router, type Request } from "express";
import { supabaseServer } from "../lib/supabaseServer";
import { requireAdmin } from "./adminAuth";
import {
  getAssignableUsers,
  getAssignablePlans,
  assignPackageToUser,
  parseAssignStartDate,
} from "../services/relationshipService";

const router = Router();

router.use(requireAdmin);

const PHASE_TITLES = ["Restore", "Retrain", "Reclaim"] as const;

function phaseTitleForPhaseIndex(phaseIndex: number): string {
  if (phaseIndex <= 0) return PHASE_TITLES[0];
  if (phaseIndex === 1) return PHASE_TITLES[1];
  return PHASE_TITLES[2];
}

/** Optional body: phase_index 0–2 (Restore/Retrain/Reclaim) + slot_index 0–3 → unlock_sequence 0–11. */
function parsePhaseSlotFromBody(body: unknown): {
  phase_index: number;
  slot_index: number;
  unlock_sequence: number;
} | null {
  if (body == null || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (b.phase_index === undefined && b.slot_index === undefined) return null;
  const p = Number(b.phase_index);
  const s = Number(b.slot_index);
  if (
    !Number.isInteger(p) ||
    !Number.isInteger(s) ||
    p < 0 ||
    p > 2 ||
    s < 0 ||
    s > 3
  ) {
    return null;
  }
  return { phase_index: p, slot_index: s, unlock_sequence: p * 4 + s };
}

async function maxUnlockSequenceForAssignment(assignmentId: number | string): Promise<number> {
  const { data, error } = await supabaseServer
    .from("user_assignment_session")
    .select("unlock_sequence")
    .eq("assignment_id", assignmentId as any)
    .eq("is_removed", false);
  if (error || !data?.length) return -1;
  let m = -1;
  for (const r of data) {
    const u = (r as { unlock_sequence?: number | null }).unlock_sequence;
    if (u != null && Number.isFinite(Number(u))) m = Math.max(m, Number(u));
  }
  return m;
}

async function isUnlockSequenceTakenByOther(
  assignmentId: number | string,
  seq: number,
  excludeUasId?: string,
): Promise<boolean> {
  let q = supabaseServer
    .from("user_assignment_session")
    .select("user_assignment_session_id")
    .eq("assignment_id", assignmentId as any)
    .eq("is_removed", false)
    .eq("unlock_sequence", seq);
  if (excludeUasId) {
    q = q.neq("user_assignment_session_id", excludeUasId);
  }
  const { data } = await q.limit(1);
  return (data?.length ?? 0) > 0;
}

function attachPhaseGridFields(sessions: any[]): void {
  sessions.forEach((s, i) => {
    // In draft mode, many template sessions have no explicit unlock_sequence yet.
    // Using the array index (`i`) causes slots to "shift" when a session is removed.
    // Prefer stable template order_index as the fallback so draft deletions preserve
    // the admin's layout until publish materializes the final 0..n-1 chain.
    // `plan_module.order_index` is typically 1-based; convert to 0-based for grid slots.
    const fallback =
      s.order_index != null && Number.isFinite(Number(s.order_index))
        ? Math.max(0, Number(s.order_index) - 1)
        : i;
    const eff =
      s.unlock_sequence != null && s.unlock_sequence !== undefined
        ? Number(s.unlock_sequence)
        : fallback;
    const phaseIndex = Math.min(2, Math.max(0, Math.floor(eff / 4)));
    s.phase_index = phaseIndex;
    s.slot_index = eff % 4;
    s.phase_title = phaseTitleForPhaseIndex(phaseIndex);
  });
}

/**
 * Build chain order 0..n-1: rows with unlock_sequence claim that index when in range and unique;
 * remaining rows fill gaps in plan order. Prevents “only slotted sessions show first; templates
 * vanish” when mixing placed grid slots with implicit plan order.
 */
function mergeIncludedSessionsByUnlockSlots<
  T extends { unlock_sequence?: number | null; order_index: number; module_id: number },
>(templateIncluded: T[], addedIncluded: T[]): T[] {
  const items = [...templateIncluded, ...addedIncluded];
  const n = items.length;
  if (n === 0) return [];
  const occupied = new Map<number, T>();
  const unplaced: T[] = [];
  for (const it of items) {
    const raw = it.unlock_sequence;
    if (raw != null && raw !== undefined && Number.isFinite(Number(raw))) {
      const k = Number(raw);
      if (k >= 0 && k < n && !occupied.has(k)) occupied.set(k, it);
      else unplaced.push(it);
    } else {
      unplaced.push(it);
    }
  }
  unplaced.sort(
    (a, b) =>
      Number(a.order_index) - Number(b.order_index) ||
      Number(a.module_id) - Number(b.module_id),
  );
  const out: T[] = [];
  let ui = 0;
  for (let pos = 0; pos < n; pos++) {
    if (occupied.has(pos)) out.push(occupied.get(pos)!);
    else if (ui < unplaced.length) out.push(unplaced[ui++]);
  }
  while (ui < unplaced.length) out.push(unplaced[ui++]);
  return out;
}

/** Best-effort feed row for admin dashboard + Edit User “recent activity”. */
async function logPlanAssignmentActivity(message: string): Promise<void> {
  try {
    await supabaseServer.from("admin_dashboard_activity").insert({ message });
  } catch {
    /* optional */
  }
}

function formatPersonNameFromRow(row: {
  fname?: string | null;
  lname?: string | null;
} | null): string | null {
  if (!row) return null;
  const n = [row.fname, row.lname]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  return n || null;
}

/** Lowercase email for `[client:…]` filter prefix (unchanged for plan-activity API). */
async function clientTagForAuthUser(userId: string): Promise<string> {
  const assignable = await getAssignableUsers(supabaseServer);
  const patient = assignable.find((u) => u.id === userId);
  return (patient?.email ?? userId).trim().toLowerCase();
}

async function displayNameFromProfiles(opts: {
  authUserId?: string;
  email?: string;
}): Promise<string | null> {
  const uid = opts.authUserId?.trim();
  if (uid) {
    const { data } = await supabaseServer
      .from("profiles")
      .select("display_name")
      .eq("id", uid)
      .maybeSingle();
    const dn = String((data as { display_name?: string | null })?.display_name ?? "").trim();
    if (dn) return dn;
  }
  const em = opts.email?.trim();
  if (em) {
    const { data } = await supabaseServer
      .from("profiles")
      .select("display_name")
      .ilike("email", em)
      .maybeSingle();
    const dn = String((data as { display_name?: string | null })?.display_name ?? "").trim();
    if (dn) return dn;
  }
  return null;
}

async function patientDisplayNameForAuthUser(authUserId: string): Promise<string> {
  const assignable = await getAssignableUsers(supabaseServer);
  const patient = assignable.find((u) => u.id === authUserId);
  const fromAssignable = patient?.full_name?.trim();
  if (fromAssignable) return fromAssignable;
  const em = (patient?.email ?? "").trim();
  if (em) {
    const { data } = await supabaseServer
      .from("user")
      .select("fname, lname")
      .eq("email", em)
      .maybeSingle();
    const nm = formatPersonNameFromRow(data as { fname?: string; lname?: string } | null);
    if (nm) return nm;
  }
  const fromProfile = await displayNameFromProfiles({
    authUserId: authUserId,
    email: em || undefined,
  });
  if (fromProfile) return fromProfile;
  return em || "Client";
}

async function adminDisplayNameFromReq(req: Request): Promise<string> {
  const email = adminEmailFromReq(req);
  if (!email || email === "unknown admin") return "Admin";
  const { data } = await supabaseServer
    .from("user")
    .select("fname, lname")
    .eq("email", email)
    .maybeSingle();
  const nm = formatPersonNameFromRow(data as { fname?: string; lname?: string } | null);
  if (nm) return nm;
  const profileName = await displayNameFromProfiles({ email });
  if (profileName) return profileName;
  const local = email.split("@")[0] ?? "admin";
  const words = local.split(/[._-]+/).filter(Boolean);
  if (words.length === 0) return "Admin";
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function adminEmailFromReq(req: Request): string {
  const a = (req as Request & { admin?: { email?: string } }).admin;
  return (a?.email ?? "").trim() || "unknown admin";
}

router.get("/resolve-client", async (req, res) => {
  try {
    const emailRaw = String(req.query.email ?? "").trim().toLowerCase();
    const userIdRaw = req.query.user_id;
    let emailToSearch = emailRaw;
    if (!emailToSearch && userIdRaw != null && String(userIdRaw).trim() !== "") {
      const uid = Number(userIdRaw);
      if (!Number.isFinite(uid)) {
        return res.status(400).json({ error: "Invalid user_id." });
      }
      const { data, error } = await supabaseServer
        .from("user")
        .select("email")
        .eq("user_id", uid)
        .maybeSingle();
      if (error || !data || !(data as { email?: string }).email) {
        return res.status(404).json({ error: "Profile not found for user_id." });
      }
      emailToSearch = String((data as { email: string }).email)
        .trim()
        .toLowerCase();
    }
    if (!emailToSearch) {
      return res.status(400).json({ error: "Provide email or user_id." });
    }
    const users = await getAssignableUsers(supabaseServer);
    const match = users.find(
      (u) => (u.email ?? "").trim().toLowerCase() === emailToSearch,
    );
    if (!match) {
      return res.status(404).json({
        error: "No assignable auth account matches this client.",
      });
    }
    return res.json({ id: match.id, email: match.email });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Resolve failed.",
    });
  }
});

/** Recent plan-assignment related messages; filter with ?client_email= for one patient. */
router.get("/plan-activity", async (req, res) => {
  try {
    const clientEmail = String(req.query.client_email ?? "").trim().toLowerCase();
    const limit = Math.min(80, Math.max(1, Number(req.query.limit) || 25));
    const q = supabaseServer
      .from("admin_dashboard_activity")
      .select("created_at, message")
      .order("created_at", { ascending: false })
      .limit(limit * 3);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    let rows = Array.isArray(data) ? data : [];
    if (clientEmail) {
      const needle = `[client:${clientEmail}]`;
      rows = rows.filter((r: { message?: string }) =>
        String(r?.message ?? "").includes(needle),
      );
    }
    rows = rows.slice(0, limit);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to load activity.",
    });
  }
});

router.get("/users", async (_req, res) => {
  try {
    const users = await getAssignableUsers(supabaseServer);
    return res.json(users);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch users",
    });
  }
});

router.get("/plans", async (_req, res) => {
  try {
    const plans = await getAssignablePlans(supabaseServer);
    return res.json(plans);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch plans",
    });
  }
});

/** Returns all sessions (modules) for clinician pickers. */
router.get("/modules", async (_req, res) => {
  try {
    const { data, error } = await supabaseServer
      .from("module")
      .select("module_id, title, description, session_number")
      .order("session_number", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const list = Array.isArray(data) ? data : [];
    const moduleIds = list
      .map((r: any) => Number(r.module_id))
      .filter((v: any) => Number.isFinite(v));

    // Provide a thumbnail for the module based on its first exercise thumbnail (best effort).
    let thumbMap = new Map<number, string>();
    if (moduleIds.length > 0) {
      const meRes = await supabaseServer
        .from("module_exercise")
        .select(
          `
          module_id,
          order_index,
          exercise:exercise ( thumbnail_url )
        `,
        )
        .in("module_id", moduleIds as any)
        .order("order_index", { ascending: true });
      if (meRes.error) {
        return res.status(500).json({ error: meRes.error.message });
      }
      for (const row of meRes.data ?? []) {
        const mid = Number((row as any).module_id);
        const url = String(
          ((row as any).exercise?.[0] ?? (row as any).exercise ?? {})?.thumbnail_url ??
            "",
        );
        if (Number.isFinite(mid) && url && !thumbMap.has(mid)) {
          thumbMap.set(mid, url);
        }
      }
    }

    return res.json(
      list.map((r: any) => ({
        ...r,
        thumbnail_url: thumbMap.get(Number(r.module_id)) ?? null,
      })),
    );
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch modules",
    });
  }
});

router.post("/assign-package", async (req, res) => {
  try {
    const { user_id, package_id, start_date } = req.body;
    const defer_session_layout =
      req.body?.defer_session_layout === true ||
      req.body?.defer_session_layout === "true";

    if (!user_id || !package_id) {
      return res.status(400).json({
        error: "Please select both user and package.",
      });
    }

    let startDate: string;
    try {
      startDate = parseAssignStartDate(start_date);
    } catch (e) {
      return res.status(400).json({
        error: e instanceof Error ? e.message : "Invalid start_date.",
      });
    }

    const result = await assignPackageToUser(
      supabaseServer,
      String(user_id),
      Number(package_id),
      startDate,
      defer_session_layout ? { deferSessionLayoutPublish: true } : undefined,
    );

    if (!defer_session_layout) {
      try {
        await materializeSessionLayoutAndPublish(
          String(user_id),
          result.assignment_id,
          startDate,
        );
      } catch (e) {
        return res.status(500).json({
          error:
            e instanceof Error ? e.message : "Failed to publish session layout.",
        });
      }
    }

    try {
      const adminName = await adminDisplayNameFromReq(req);
      const patientName = await patientDisplayNameForAuthUser(String(user_id));
      const clientTag = await clientTagForAuthUser(String(user_id));
      let planTitle = `Plan #${Number(package_id)}`;
      const planRow = await supabaseServer
        .from("plan")
        .select("title")
        .eq("plan_id", Number(package_id))
        .maybeSingle();
      if (planRow.data && (planRow.data as { title?: string }).title) {
        planTitle = String((planRow.data as { title: string }).title);
      }
      await logPlanAssignmentActivity(
        `[client:${clientTag}] ${adminName} assigned "${planTitle}" to ${patientName}`,
      );
    } catch {
      /* best-effort: assign already succeeded */
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to assign package",
    });
  }
});

/**
 * Returns plans already assigned to a given user (user_packages + plan title).
 * Used by the Assign Package UI to show "Assigned plans".
 */
router.get("/users/:userId/packages", async (req, res) => {
  try {
    const userId = String(req.params.userId || "").trim();
    if (!userId) {
      return res.status(400).json({ error: "Missing userId." });
    }

    // Step 1: fetch user_packages rows (no joins; most robust across schema cache).
    const upRes = await supabaseServer
      .from("user_packages")
      .select("id, package_id, start_date, created_at, session_layout_published_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (upRes.error) {
      return res.status(500).json({ error: upRes.error.message });
    }

    const userPackages = upRes.data ?? [];
    const planIds = Array.from(
      new Set(
        userPackages
          .map((r: any) => r.package_id)
          .filter((v: any) => v !== null && v !== undefined),
      ),
    );

    // Step 2: fetch plan titles for those package_ids.
    const planMap = new Map<number, string>();
    if (planIds.length > 0) {
      const plansRes = await supabaseServer
        .from("plan")
        .select("plan_id, title")
        .in("plan_id", planIds as any);
      if (plansRes.error) {
        return res.status(500).json({ error: plansRes.error.message });
      }
      for (const p of plansRes.data ?? []) {
        planMap.set(Number((p as any).plan_id), String((p as any).title ?? ""));
      }
    }

    const rows = userPackages.map((r: any) => {
      const pid = Number(r.package_id);
      return {
        id: r.id,
        package_id: r.package_id,
        title: planMap.get(pid) || null,
        start_date: r.start_date ?? null,
        created_at: r.created_at ?? null,
        session_layout_published_at: r.session_layout_published_at ?? null,
      };
    });

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to fetch assignments",
    });
  }
});

function addDaysUtc(yyyyMmDd: string, daysToAdd: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = Date.UTC(y, mo - 1, d);
  if (Number.isNaN(t)) return null;
  const out = new Date(t + daysToAdd * 86400000);
  return out.toISOString();
}

function isLockedByIsoDate(unlockDateIso: string | null): boolean {
  if (!unlockDateIso) return true;
  const t = Date.parse(unlockDateIso);
  if (Number.isNaN(t)) return true;
  return Date.now() < t;
}

async function getUserPackageAssignment(
  userId: string,
  assignmentId: string,
): Promise<
  | {
      id: string;
      user_id: string;
      package_id: number;
      start_date: string | null;
      created_at: string | null;
      session_layout_published_at: string | null;
    }
  | null
> {
  const assignmentIdValue =
    /^\d+$/.test(assignmentId.trim()) ? Number(assignmentId) : assignmentId;
  const { data, error } = await supabaseServer
    .from("user_packages")
    .select("id, user_id, package_id, start_date, created_at, session_layout_published_at")
    .eq("user_id", userId)
    .eq("id", assignmentIdValue as any)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    package_id: Number(row.package_id),
    start_date: (row.start_date as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
    session_layout_published_at:
      row.session_layout_published_at == null
        ? null
        : String(row.session_layout_published_at),
  };
}

/**
 * Schedule-based unlocks (start_date + 7d * unlock_sequence).
 * We create unlock rows up-front (at publish) so the "timer keeps running"
 * even if the patient completes late.
 */
async function bootstrapScheduledSessionUnlocksForUser(
  userId: string,
  assignmentId: number | string,
): Promise<void> {
  const assignmentIdValue =
    typeof assignmentId === "number" || /^\d+$/.test(String(assignmentId).trim())
      ? Number(assignmentId)
      : String(assignmentId);

  const { data: up, error: e1 } = await supabaseServer
    .from("user_packages")
    .select("id, start_date, session_layout_published_at")
    .eq("user_id", userId)
    .eq("id", assignmentIdValue as any)
    .maybeSingle();
  if (e1 || !up) return;
  if ((up as any).session_layout_published_at == null) return;

  // start_date is stored as timestamptz (often like "2026-04-14 00:00:00+00").
  // We want schedule anchoring by *date*, not by publish-time.
  const startDateRaw = String((up as any).start_date ?? "").trim();
  const startDateYmd = startDateRaw.length >= 10 ? startDateRaw.slice(0, 10) : "";
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDateYmd);
  const startMs = dm
    ? Date.UTC(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]))
    : Date.now();

  const { data: chain, error: e2 } = await supabaseServer
    .from("user_assignment_session")
    .select("user_assignment_session_id, unlock_sequence")
    .eq("assignment_id", assignmentIdValue as any)
    .eq("user_id", userId)
    .eq("is_removed", false)
    .not("unlock_sequence", "is", null)
    .order("unlock_sequence", { ascending: true });
  if (e2) return;

  const rows = (chain ?? []) as Array<{ user_assignment_session_id: string; unlock_sequence: number }>;
  if (rows.length === 0) return;

  const inserts = rows
    .map((r) => {
      const seq = Number((r as any).unlock_sequence);
      const id = String((r as any).user_assignment_session_id ?? "").trim();
      if (!id || !Number.isFinite(seq) || seq < 0) return null;
      const unlock_date = new Date(startMs + seq * 7 * 24 * 60 * 60 * 1000).toISOString();
      return { user_id: userId, user_assignment_session_id: id, unlock_date };
    })
    .filter(Boolean) as Array<{
    user_id: string;
    user_assignment_session_id: string;
    unlock_date: string;
  }>;

  if (inserts.length === 0) return;
  const ins = await supabaseServer.from("user_assignment_session_unlock").upsert(inserts as any, {
    onConflict: "user_id,user_assignment_session_id",
  });
  if (ins.error) throw new Error(ins.error.message);
}

/** Legacy bootstrap still used by older mobile; keep for now. */
async function bootstrapFirstSessionUnlockForUser(userId: string): Promise<void> {
  const { data: latest, error: e1 } = await supabaseServer
    .from("user_packages")
    .select("id, start_date")
    .eq("user_id", userId)
    .not("session_layout_published_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (e1 || !latest) return;

  const { data: first, error: e2 } = await supabaseServer
    .from("user_assignment_session")
    .select("module_id")
    .eq("assignment_id", (latest as { id: unknown }).id as any)
    .eq("user_id", userId)
    .eq("is_removed", false)
    .not("unlock_sequence", "is", null)
    .order("unlock_sequence", { ascending: true })
    .order("module_id", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (e2 || !first) return;

  const module_id = Number((first as { module_id: unknown }).module_id);
  if (!Number.isFinite(module_id)) return;

  const sd = String((latest as { start_date?: unknown }).start_date ?? "").trim();
  let startMs = Date.now();
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(sd);
  if (dm) {
    const y = Number(dm[1]);
    const mo = Number(dm[2]);
    const d = Number(dm[3]);
    startMs = Date.UTC(y, mo - 1, d);
  }
  const unlockMs = Math.max(Date.now(), startMs);
  const unlock_date = new Date(unlockMs).toISOString();

  const ins = await supabaseServer.from("user_session_unlock").insert({
    user_id: userId,
    module_id,
    unlock_date,
  });
  if (ins.error && (ins.error as { code?: string }).code !== "23505") {
    throw new Error(ins.error.message);
  }
}

type MergeRowForMaterialize =
  | {
      kind: "template";
      plan_module_id: number;
      module_id: number;
      order_index: number;
      unlock_sequence: number | null;
      existing_uas_id: string | undefined;
    }
  | {
      kind: "added";
      module_id: number;
      order_index: number;
      unlock_sequence: number | null;
      user_assignment_session_id: string;
    };

/**
 * Persists merged session order to user_assignment_session (template rows created when missing),
 * sets start_date + session_layout_published_at, then bootstraps first unlock for the patient.
 */
async function materializeSessionLayoutAndPublish(
  userId: string,
  assignmentId: string,
  startDateInput: string,
): Promise<void> {
  const startDate = parseAssignStartDate(startDateInput);
  const assignment = await getUserPackageAssignment(userId, assignmentId);
  if (!assignment) throw new Error("Assignment not found.");
  const assignmentIdValue =
    /^\d+$/.test(assignmentId.trim()) ? Number(assignmentId) : assignmentId;

  const pmRes = await supabaseServer
    .from("plan_module")
    .select("plan_module_id, order_index, module_id")
    .eq("plan_id", assignment.package_id)
    .order("order_index", { ascending: true });
  if (pmRes.error) throw new Error(pmRes.error.message);

  const uasRes = await supabaseServer
    .from("user_assignment_session")
    .select(
      "user_assignment_session_id, source_plan_module_id, module_id, order_index, unlock_sequence, is_removed",
    )
    .eq("assignment_id", assignmentIdValue as any);
  if (uasRes.error) throw new Error(uasRes.error.message);

  const overridesByPlanModule = new Map<string, Record<string, unknown>>();
  const addedRows: Record<string, unknown>[] = [];
  for (const r of uasRes.data ?? []) {
    const row = r as Record<string, unknown>;
    if (row.source_plan_module_id != null) {
      overridesByPlanModule.set(String(row.source_plan_module_id), row);
    } else {
      addedRows.push(row);
    }
  }

  const templateIncluded: MergeRowForMaterialize[] = [];
  const templateExcluded: { plan_module_id: number; module_id: number; existing_uas_id?: string }[] =
    [];
  for (const row of pmRes.data ?? []) {
    const planModuleId = Number((row as { plan_module_id: unknown }).plan_module_id);
    const orderIndex = Number((row as { order_index: unknown }).order_index);
    const moduleId = Number((row as { module_id: unknown }).module_id);
    const ov = overridesByPlanModule.get(String(planModuleId)) as
      | {
          user_assignment_session_id?: string;
          is_removed?: boolean;
          unlock_sequence?: number | null;
        }
      | undefined;
    const removed = ov?.is_removed === true;
    const uSeq =
      ov?.unlock_sequence != null && ov.unlock_sequence !== undefined
        ? Number(ov.unlock_sequence)
        : null;
    const base = {
      plan_module_id: planModuleId,
      module_id: moduleId,
      order_index: orderIndex,
      unlock_sequence: Number.isFinite(uSeq as number) ? uSeq : null,
      existing_uas_id:
        ov?.user_assignment_session_id != null
          ? String(ov.user_assignment_session_id)
          : undefined,
    };
    if (removed) {
      templateExcluded.push({
        plan_module_id: planModuleId,
        module_id: moduleId,
        existing_uas_id: base.existing_uas_id,
      });
    } else {
      templateIncluded.push({ kind: "template", ...base });
    }
  }

  const addedIncluded: MergeRowForMaterialize[] = addedRows.map((r) => {
    const us = r.unlock_sequence;
    return {
      kind: "added" as const,
      module_id: Number(r.module_id),
      order_index: Number(r.order_index ?? 999999),
      unlock_sequence:
        us != null && us !== undefined && Number.isFinite(Number(us)) ? Number(us) : null,
      user_assignment_session_id: String(r.user_assignment_session_id),
    };
  });

  const includedSequence = mergeIncludedSessionsByUnlockSlots(templateIncluded, addedIncluded);

  for (let seq = 0; seq < includedSequence.length; seq++) {
    const s = includedSequence[seq];
    if (s.kind === "template") {
      if (s.existing_uas_id) {
        const upd = await supabaseServer
          .from("user_assignment_session")
          .update({
            unlock_sequence: seq,
            order_index: null,
            is_removed: false,
          })
          .eq("user_assignment_session_id", s.existing_uas_id);
        if (upd.error) throw new Error(upd.error.message);
      } else {
        const ins = await supabaseServer.from("user_assignment_session").insert({
          user_id: userId,
          assignment_id: assignmentIdValue as any,
          module_id: s.module_id,
          source_plan_module_id: s.plan_module_id,
          is_removed: false,
          unlock_sequence: seq,
          order_index: null,
        });
        if (ins.error) throw new Error(ins.error.message);
      }
    } else {
      const upd = await supabaseServer
        .from("user_assignment_session")
        .update({
          unlock_sequence: seq,
          order_index: null,
        })
        .eq("user_assignment_session_id", s.user_assignment_session_id)
        .eq("assignment_id", assignmentIdValue as any)
        .eq("user_id", userId);
      if (upd.error) throw new Error(upd.error.message);
    }
  }

  for (const ex of templateExcluded) {
    if (ex.existing_uas_id) {
      const upd = await supabaseServer
        .from("user_assignment_session")
        .update({ is_removed: true, unlock_sequence: null, order_index: null })
        .eq("user_assignment_session_id", ex.existing_uas_id);
      if (upd.error) throw new Error(upd.error.message);
    } else {
      const ins = await supabaseServer.from("user_assignment_session").insert({
        user_id: userId,
        assignment_id: assignmentIdValue as any,
        module_id: ex.module_id,
        source_plan_module_id: ex.plan_module_id,
        is_removed: true,
        unlock_sequence: null,
        order_index: null,
      });
      if (ins.error) throw new Error(ins.error.message);
    }
  }

  const publishedAt = new Date().toISOString();
  const upUpd = await supabaseServer
    .from("user_packages")
    .update({
      start_date: startDate,
      session_layout_published_at: publishedAt,
    })
    .eq("user_id", userId)
    .eq("id", assignmentIdValue as any)
    .select("id")
    .maybeSingle();
  if (upUpd.error) throw new Error(upUpd.error.message);
  if (!upUpd.data) throw new Error("Assignment not found.");

  // Fresh start: wipe any previous progress for modules in this new assignment chain.
  // This prevents old unlocks/completions from leaking across plan assignments when modules are reused.
  const chainUasIds = Array.from(
    new Set(
      includedSequence
        .map((s) =>
          String(
            (s as { user_assignment_session_id?: string }).user_assignment_session_id ??
              (s as { existing_uas_id?: string }).existing_uas_id ??
              "",
          ).trim(),
        )
        .filter((v) => v !== ""),
    ),
  );
  const chainModuleIds = Array.from(
    new Set(
      includedSequence
        .map((s) => Number((s as { module_id: number }).module_id))
        .filter((v) => Number.isFinite(v)),
    ),
  );
  if (chainUasIds.length > 0) {
    const delUasUnlocks = await supabaseServer
      .from("user_assignment_session_unlock")
      .delete()
      .eq("user_id", userId)
      .in("user_assignment_session_id", chainUasIds as any);
    if (delUasUnlocks.error) throw new Error(delUasUnlocks.error.message);

    const delUasCompletions = await supabaseServer
      .from("user_assignment_session_completion")
      .delete()
      .eq("user_id", userId)
      .in("user_assignment_session_id", chainUasIds as any);
    if (delUasCompletions.error) throw new Error(delUasCompletions.error.message);
  }
  if (chainModuleIds.length > 0) {
    const delUnlocks = await supabaseServer
      .from("user_session_unlock")
      .delete()
      .eq("user_id", userId)
      .in("module_id", chainModuleIds as any);
    if (delUnlocks.error) throw new Error(delUnlocks.error.message);

    const delCompletions = await supabaseServer
      .from("user_session_completion")
      .delete()
      .eq("user_id", userId)
      .in("module_id", chainModuleIds as any);
    if (delCompletions.error) throw new Error(delCompletions.error.message);
  }

  // Schedule-based unlock rows for entire chain (timer runs from start_date).
  await bootstrapScheduledSessionUnlocksForUser(userId, assignmentIdValue as any);

  // Legacy unlock table used by some older reads; keep first-session bootstrap for compatibility.
  await bootstrapFirstSessionUnlockForUser(userId);
}

/**
 * Returns the ordered session list for a specific assignment (user_packages row).
 * This powers the clinician "edit sessions per patient" UI.
 */
router.get("/users/:userId/assignments/:assignmentId/sessions", async (req, res) => {
  try {
    const userId = String(req.params.userId || "").trim();
    const assignmentId = String(req.params.assignmentId || "").trim();
    if (!userId || !assignmentId) {
      return res.status(400).json({ error: "Missing userId or assignmentId." });
    }
    const assignmentIdValue =
      /^\d+$/.test(assignmentId.trim()) ? Number(assignmentId) : assignmentId;

    const assignment = await getUserPackageAssignment(userId, assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found." });
    }

    const planRes = await supabaseServer
      .from("plan")
      .select("plan_id, title")
      .eq("plan_id", assignment.package_id)
      .maybeSingle();
    if (planRes.error) {
      return res.status(500).json({ error: planRes.error.message });
    }

    const pmRes = await supabaseServer
      .from("plan_module")
      .select(
        `
        plan_module_id,
        order_index,
        module_id,
        module:module (
          module_id,
          title,
          description,
          session_number
        )
      `,
      )
      .eq("plan_id", assignment.package_id)
      .order("order_index", { ascending: true });
    if (pmRes.error) {
      return res.status(500).json({ error: pmRes.error.message });
    }

    const startDate = assignment.start_date;
    // Load per-assignment session overrides/additions.
    const uasRes = await supabaseServer
      .from("user_assignment_session")
      .select(
        `
        user_assignment_session_id,
        source_plan_module_id,
        module_id,
        order_index,
        unlock_sequence,
        is_removed,
        module:module (
          module_id,
          title,
          description,
          session_number
        )
      `,
      )
      .eq("assignment_id", assignmentIdValue as any);

    if (uasRes.error) {
      return res.status(500).json({ error: uasRes.error.message });
    }

    const overridesByPlanModule = new Map<string, any>();
    const addedRows: any[] = [];
    for (const r of uasRes.data ?? []) {
      if (r.source_plan_module_id != null) {
        overridesByPlanModule.set(String(r.source_plan_module_id), r);
      } else {
        addedRows.push(r);
      }
    }

    // Template sessions (plan_module) with optional removal.
    const templateIncluded: any[] = [];
    const templateExcluded: any[] = [];
    for (const row of pmRes.data ?? []) {
      const orderIndex = Number(row.order_index);
      const mod = ((row as any).module?.[0] ?? (row as any).module ?? {}) as any;
      const planModuleId = Number((row as any).plan_module_id);
      const ov = overridesByPlanModule.get(String(planModuleId));
      const removed = ov?.is_removed === true;

      const uSeq =
        ov?.unlock_sequence != null && ov.unlock_sequence !== undefined
          ? Number(ov.unlock_sequence)
          : null;
      const base = {
        order_index: orderIndex,
        module_id: Number(row.module_id ?? mod.module_id),
        title: String(mod.title ?? ""),
        description: mod.description ?? null,
        session_number: mod.session_number ?? null,
        unlock_date: null as string | null,
        user_assignment_session_id:
          ov?.user_assignment_session_id != null
            ? String(ov.user_assignment_session_id)
            : undefined,
        unlock_sequence: Number.isFinite(uSeq as number) ? uSeq : null,
        kind: "template" as const,
      };
      if (removed) {
        templateExcluded.push({ ...base, is_unlocked: false });
      } else {
        templateIncluded.push({ ...base, is_unlocked: true });
      }
    }

    // Added sessions are always included; order_index after template.
    const addedIncluded = addedRows.map((r: any) => {
      const mod = (r.module?.[0] ?? r.module ?? {}) as any;
      const us = r.unlock_sequence;
      return {
        user_assignment_session_id: String(r.user_assignment_session_id),
        order_index: Number(r.order_index ?? 999999),
        module_id: Number(r.module_id ?? mod.module_id),
        title: String(mod.title ?? ""),
        description: mod.description ?? null,
        session_number: mod.session_number ?? null,
        is_unlocked: true,
        unlock_date: null as string | null,
        thumbnail_url: null as string | null,
        kind: "added" as const,
        unlock_sequence:
          us != null && us !== undefined && Number.isFinite(Number(us)) ? Number(us) : null,
      };
    });

    // Best-effort thumbnails for all modules in this plan view (first exercise thumbnail).
    const allModuleIds = Array.from(
      new Set(
        [...templateIncluded, ...templateExcluded, ...addedIncluded]
          .map((s) => Number(s.module_id))
          .filter((v) => Number.isFinite(v)),
      ),
    );
    if (allModuleIds.length > 0) {
      const meRes = await supabaseServer
        .from("module_exercise")
        .select(
          `
          module_id,
          order_index,
          exercise:exercise ( thumbnail_url )
        `,
        )
        .in("module_id", allModuleIds as any)
        .order("order_index", { ascending: true });
      if (meRes.error) {
        return res.status(500).json({ error: meRes.error.message });
      }
      const tmap = new Map<number, string>();
      for (const row of meRes.data ?? []) {
        const mid = Number((row as any).module_id);
        const url = String(
          ((row as any).exercise?.[0] ?? (row as any).exercise ?? {})?.thumbnail_url ??
            "",
        );
        if (Number.isFinite(mid) && url && !tmap.has(mid)) tmap.set(mid, url);
      }
      for (const s of [...templateIncluded, ...templateExcluded, ...addedIncluded]) {
        const url = tmap.get(Number(s.module_id));
        if (url) s.thumbnail_url = url;
      }
    }

    const includedSequence = mergeIncludedSessionsByUnlockSlots(templateIncluded, addedIncluded);
    attachPhaseGridFields(includedSequence);
    for (let i = 0; i < includedSequence.length; i++) {
      const s = includedSequence[i];
      s.unlock_date =
        typeof startDate === "string"
          ? addDaysUtc(startDate, i * 7)
          : null;
    }

    // Patient truth (instance-scoped): unlock/completion must be keyed by user_assignment_session_id
    // so duplicate module_ids don't leak progress.
    const uasIds = includedSequence
      .map((s) =>
        String(
          (s as { user_assignment_session_id?: string }).user_assignment_session_id ??
            (s as { existing_uas_id?: string }).existing_uas_id ??
            "",
        ).trim(),
      )
      .filter((v) => v !== "");

    if (uasIds.length > 0) {
      const unlockRes = await supabaseServer
        .from("user_assignment_session_unlock")
        .select("user_assignment_session_id, unlock_date")
        .eq("user_id", userId)
        .in("user_assignment_session_id", uasIds as any);
      if (unlockRes.error) {
        return res.status(500).json({ error: unlockRes.error.message });
      }
      const unlockByUasId = new Map<string, string>();
      for (const row of unlockRes.data ?? []) {
        const id = String((row as any).user_assignment_session_id ?? "").trim();
        const ud = String((row as any).unlock_date ?? "");
        if (id && ud) unlockByUasId.set(id, ud);
      }

      const compRes = await supabaseServer
        .from("user_assignment_session_completion")
        .select("user_assignment_session_id, completed_at")
        .eq("user_id", userId)
        .in("user_assignment_session_id", uasIds as any);
      if (compRes.error) {
        return res.status(500).json({ error: compRes.error.message });
      }
      const completed = new Set<string>();
      for (const row of compRes.data ?? []) {
        const id = String((row as any).user_assignment_session_id ?? "").trim();
        if (id) completed.add(id);
      }

      // Completion gate: session N is considered unlocked only if:
      // - its scheduled unlock_date is reached, AND
      // - session N-1 is completed (except N=0).
      const uasIdBySeq = new Map<number, string>();
      for (const s of includedSequence) {
        const seq = Number((s as any).unlock_sequence);
        const uasId = String(
          (s as { user_assignment_session_id?: string }).user_assignment_session_id ??
            (s as { existing_uas_id?: string }).existing_uas_id ??
            "",
        ).trim();
        if (Number.isFinite(seq) && seq >= 0 && uasId) uasIdBySeq.set(seq, uasId);
      }

      for (const s of includedSequence) {
        const uasId = String(
          (s as { user_assignment_session_id?: string }).user_assignment_session_id ??
            (s as { existing_uas_id?: string }).existing_uas_id ??
            "",
        ).trim();
        const override = uasId ? unlockByUasId.get(uasId) : undefined;
        (s as any).patient_unlock_date = override ?? null;
        const seq = Number((s as any).unlock_sequence);
        const scheduledReached = !!override && !isLockedByIsoDate(override);
        const prevOk =
          Number.isFinite(seq) && seq > 0
            ? completed.has(uasIdBySeq.get(seq - 1) ?? "")
            : true;
        (s as any).patient_is_unlocked = scheduledReached && prevOk;
        (s as any).patient_is_completed = uasId ? completed.has(uasId) : false;
        if (override) s.unlock_date = override;
      }
    }

    // Keep excluded available to add in dropdown.
    for (const s of templateExcluded) {
      s.phase_index = null;
      s.phase_title = null;
      s.slot_index = null;
      if (s.unlock_sequence === undefined) s.unlock_sequence = null;
    }
    const sessions = [
      ...includedSequence,
      ...templateExcluded.sort((a, b) => a.order_index - b.order_index),
    ];

    return res.json({
      plan_id: assignment.package_id,
      plan_title: planRes.data?.title ?? "",
      start_date: assignment.start_date,
      session_layout_published_at: assignment.session_layout_published_at,
      sessions,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch sessions",
    });
  }
});

/** Adds a session for this assignment: either re-include a removed template session, or add an extra module. */
router.post("/users/:userId/assignments/:assignmentId/sessions", async (req, res) => {
  try {
    const userId = String(req.params.userId || "").trim();
    const assignmentId = String(req.params.assignmentId || "").trim();
    const moduleId = Number(req.body?.module_id);
    if (!userId || !assignmentId || !Number.isFinite(moduleId)) {
      return res.status(400).json({ error: "Invalid parameters." });
    }

    const phaseSlot = parsePhaseSlotFromBody(req.body);
    if (
      (req.body?.phase_index !== undefined || req.body?.slot_index !== undefined) &&
      !phaseSlot
    ) {
      return res.status(400).json({
        error: "phase_index and slot_index must be integers: phase 0–2, slot 0–3.",
      });
    }

    const assignment = await getUserPackageAssignment(userId, assignmentId);
    if (!assignment) return res.status(404).json({ error: "Assignment not found." });
    const assignmentIdValue = /^\d+$/.test(assignmentId) ? Number(assignmentId) : assignmentId;

    const slotTakenError = () =>
      res.status(409).json({
        error: "That grid slot already has a session. Remove it or pick another slot.",
      });

    // If module is in template, either restore it (if removed) OR allow adding another instance (duplicate week).
    const pm = await supabaseServer
      .from("plan_module")
      .select("plan_module_id, order_index, module_id")
      .eq("plan_id", assignment.package_id)
      .eq("module_id", moduleId)
      .maybeSingle();
    if (pm.error) return res.status(500).json({ error: pm.error.message });

    if (pm.data) {
      const existing = await supabaseServer
        .from("user_assignment_session")
        .select("user_assignment_session_id, is_removed")
        .eq("assignment_id", assignmentIdValue as any)
        .eq("source_plan_module_id", (pm.data as any).plan_module_id)
        .maybeSingle();
      if (existing.error) return res.status(500).json({ error: existing.error.message });

      const existingRow = existing.data as {
        user_assignment_session_id: string;
        is_removed: boolean;
      } | null;
      if (existingRow && existingRow.is_removed === true) {
        const updPayload: Record<string, unknown> = { is_removed: false };
        if (phaseSlot) {
          if (
            await isUnlockSequenceTakenByOther(
              assignmentIdValue,
              phaseSlot.unlock_sequence,
              String(existingRow.user_assignment_session_id),
            )
          ) {
            return slotTakenError();
          }
          updPayload.unlock_sequence = phaseSlot.unlock_sequence;
          // order_index must stay null or >0 in older DBs; 0-based unlock_sequence can be 0 — list order uses unlock_sequence.
          updPayload.order_index = null;
        }
        const upd = await supabaseServer
          .from("user_assignment_session")
          .update(updPayload)
          .eq("user_assignment_session_id", existingRow.user_assignment_session_id);
        if (upd.error) return res.status(500).json({ error: upd.error.message });
        return res.status(201).json({ ok: true, restored: true });
      }

      if (!existingRow) {
        const insPayload: Record<string, unknown> = {
          user_id: userId,
          assignment_id: assignmentIdValue,
          module_id: moduleId,
          source_plan_module_id: (pm.data as any).plan_module_id,
          is_removed: false,
        };
        if (phaseSlot) {
          if (await isUnlockSequenceTakenByOther(assignmentIdValue, phaseSlot.unlock_sequence)) {
            return slotTakenError();
          }
          insPayload.unlock_sequence = phaseSlot.unlock_sequence;
          insPayload.order_index = null;
        }
        const ins = await supabaseServer.from("user_assignment_session").insert(insPayload);
        if (ins.error) return res.status(500).json({ error: ins.error.message });
        return res.status(201).json({ ok: true, restored: true });
      }
      // Already included in template — fall through: insert an extra "added" row.
    }

    let nextSeq: number;
    if (phaseSlot) {
      nextSeq = phaseSlot.unlock_sequence;
      if (await isUnlockSequenceTakenByOther(assignmentIdValue, nextSeq)) {
        return slotTakenError();
      }
    } else {
      nextSeq = (await maxUnlockSequenceForAssignment(assignmentIdValue)) + 1;
    }

    const ins = await supabaseServer.from("user_assignment_session").insert({
      user_id: userId,
      assignment_id: assignmentIdValue,
      module_id: moduleId,
      source_plan_module_id: null,
      order_index: null,
      unlock_sequence: nextSeq,
      is_removed: false,
    });
    if (ins.error) return res.status(500).json({ error: ins.error.message });
    return res.status(201).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to add session",
    });
  }
});

/** Removes a session from this assignment (template -> mark removed; added -> delete). */
router.delete(
  "/users/:userId/assignments/:assignmentId/sessions/:moduleId",
  async (req, res) => {
    try {
      const userId = String(req.params.userId || "").trim();
      const assignmentId = String(req.params.assignmentId || "").trim();
      const moduleId = Number(req.params.moduleId);
      if (!userId || !assignmentId || !Number.isFinite(moduleId)) {
        return res.status(400).json({ error: "Invalid parameters." });
      }

      const assignment = await getUserPackageAssignment(userId, assignmentId);
      if (!assignment) return res.status(404).json({ error: "Assignment not found." });

      const pm = await supabaseServer
        .from("plan_module")
        .select("plan_module_id")
        .eq("plan_id", assignment.package_id)
        .eq("module_id", moduleId)
        .maybeSingle();
      if (pm.error) return res.status(500).json({ error: pm.error.message });

      const assignmentIdValue = /^\d+$/.test(assignmentId) ? Number(assignmentId) : assignmentId;

      if (pm.data) {
        // mark removed (create override row if missing)
        const existing = await supabaseServer
          .from("user_assignment_session")
          .select("user_assignment_session_id")
          .eq("assignment_id", assignmentIdValue as any)
          .eq("source_plan_module_id", (pm.data as any).plan_module_id)
          .maybeSingle();
        if (existing.error) return res.status(500).json({ error: existing.error.message });

        if (existing.data) {
          const upd = await supabaseServer
            .from("user_assignment_session")
            .update({ is_removed: true })
            .eq("user_assignment_session_id", (existing.data as any).user_assignment_session_id);
          if (upd.error) return res.status(500).json({ error: upd.error.message });
        } else {
          const ins = await supabaseServer.from("user_assignment_session").insert({
            user_id: userId,
            assignment_id: assignmentIdValue as any,
            module_id: moduleId,
            source_plan_module_id: (pm.data as any).plan_module_id,
            is_removed: true,
          });
          if (ins.error) return res.status(500).json({ error: ins.error.message });
        }
        return res.json({ ok: true });
      }

      // added -> delete
      const del = await supabaseServer
        .from("user_assignment_session")
        .delete()
        .eq("assignment_id", assignmentIdValue as any)
        .eq("module_id", moduleId)
        .eq("user_id", userId)
        .is("source_plan_module_id", null)
        .select("user_assignment_session_id")
        .maybeSingle();
      if (del.error) return res.status(500).json({ error: del.error.message });
      if (!del.data) return res.status(404).json({ error: "Session not found." });
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to remove session",
      });
    }
  },
);

/** Removes a specific "added" session row by id (supports duplicates safely). */
router.delete(
  "/users/:userId/assignments/:assignmentId/sessions/added/:userAssignmentSessionId",
  async (req, res) => {
    try {
      const userId = String(req.params.userId || "").trim();
      const assignmentId = String(req.params.assignmentId || "").trim();
      const id = String(req.params.userAssignmentSessionId || "").trim();
      if (!userId || !assignmentId || !id) {
        return res.status(400).json({ error: "Invalid parameters." });
      }

      const assignment = await getUserPackageAssignment(userId, assignmentId);
      if (!assignment) return res.status(404).json({ error: "Assignment not found." });
      const assignmentIdValue = /^\d+$/.test(assignmentId) ? Number(assignmentId) : assignmentId;

      const del = await supabaseServer
        .from("user_assignment_session")
        .delete()
        .eq("user_assignment_session_id", id)
        .eq("assignment_id", assignmentIdValue as any)
        .eq("user_id", userId)
        .is("source_plan_module_id", null)
        .select("user_assignment_session_id")
        .maybeSingle();
      if (del.error) return res.status(500).json({ error: del.error.message });
      if (!del.data) return res.status(404).json({ error: "Session row not found." });
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to remove session",
      });
    }
  },
);

/** Saves sets/reps overrides for an added exercise row. */
router.patch(
  "/users/:userId/assignments/:assignmentId/sessions/:moduleId/exercises/added/:userAssignmentExerciseId",
  async (req, res) => {
    try {
      const userId = String(req.params.userId || "").trim();
      const assignmentId = String(req.params.assignmentId || "").trim();
      const moduleId = Number(req.params.moduleId);
      const id = String(req.params.userAssignmentExerciseId || "").trim();
      if (!userId || !assignmentId || !Number.isFinite(moduleId) || !id) {
        return res.status(400).json({ error: "Invalid parameters." });
      }

      const { sets, reps } = req.body ?? {};
      const hasSets = sets !== undefined;
      const hasReps = reps !== undefined;
      if (!hasSets && !hasReps) {
        return res.status(400).json({ error: "No fields to update." });
      }

      const patch: any = {};
      if (hasSets) {
        patch.sets_override =
          sets === null ? null : Math.max(1, Number(sets) || 1);
      }
      if (hasReps) {
        patch.reps_override =
          reps === null ? null : Math.max(1, Number(reps) || 1);
      }

      const upd = await supabaseServer
        .from("user_assignment_exercise")
        .update(patch)
        .eq("user_assignment_exercise_id", id)
        .eq("assignment_id", assignmentId as any)
        .eq("module_id", moduleId)
        .eq("user_id", userId)
        .is("source_module_exercise_id", null)
        .select("user_assignment_exercise_id")
        .maybeSingle();

      if (upd.error) return res.status(500).json({ error: upd.error.message });
      if (!upd.data) return res.status(404).json({ error: "Exercise row not found." });
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to update exercise",
      });
    }
  },
);

/**
 * Returns the module exercises for a specific assignment+module.
 * This is DB-backed (module_exercise + exercise) and read-only for now.
 */
router.get(
  "/users/:userId/assignments/:assignmentId/sessions/:moduleId/exercises",
  async (req, res) => {
    try {
      const userId = String(req.params.userId || "").trim();
      const assignmentId = String(req.params.assignmentId || "").trim();
      const moduleId = Number(req.params.moduleId);
      if (!userId || !assignmentId || !Number.isFinite(moduleId)) {
        return res
          .status(400)
          .json({ error: "Missing or invalid route parameters." });
      }

      const assignment = await getUserPackageAssignment(userId, assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found." });
      }

      const assignmentIdValue =
        /^\d+$/.test(assignmentId.trim()) ? Number(assignmentId) : assignmentId;

      // Validate module is either in the template plan OR added for this assignment.
      const pmCheck = await supabaseServer
        .from("plan_module")
        .select("plan_module_id")
        .eq("plan_id", assignment.package_id)
        .eq("module_id", moduleId)
        .maybeSingle();
      if (pmCheck.error) {
        return res.status(500).json({ error: pmCheck.error.message });
      }
      if (!pmCheck.data) {
        const uasCheck = await supabaseServer
          .from("user_assignment_session")
          .select("user_assignment_session_id")
          .eq("assignment_id", assignmentIdValue as any)
          .eq("module_id", moduleId)
          .eq("user_id", userId)
          .eq("is_removed", false)
          .maybeSingle();
        if (uasCheck.error) {
          return res.status(500).json({ error: uasCheck.error.message });
        }
        if (!uasCheck.data) {
          return res
            .status(404)
            .json({ error: "Module not found for this assignment." });
        }
      }

      const meRes = await supabaseServer
        .from("module_exercise")
        .select(
          `
          module_exercise_id,
          order_index,
          sets_override,
          reps_override,
          exercise (
            exercise_id,
            title,
            description,
            thumbnail_url,
            default_sets,
            default_reps
          )
        `,
        )
        .eq("module_id", moduleId)
        .order("order_index", { ascending: true });

      if (meRes.error) {
        return res.status(500).json({ error: meRes.error.message });
      }

      // Fetch per-assignment overrides/additions.
      const uaxRes = await supabaseServer
        .from("user_assignment_exercise")
        .select(
          `
          user_assignment_exercise_id,
          source_module_exercise_id,
          exercise_id,
          order_index,
          sets_override,
          reps_override,
          is_removed,
          exercise (
            exercise_id,
            title,
            description,
            thumbnail_url,
            default_sets,
            default_reps
          )
        `,
        )
        .eq("assignment_id", assignmentIdValue as any)
        .eq("module_id", moduleId);

      if (uaxRes.error) {
        return res.status(500).json({ error: uaxRes.error.message });
      }

      const overridesBySource = new Map<string, any>();
      const addedRows: any[] = [];
      for (const r of uaxRes.data ?? []) {
        if (r.source_module_exercise_id != null) {
          overridesBySource.set(String(r.source_module_exercise_id), r);
        } else {
          addedRows.push(r);
        }
      }

      const templateRows = (meRes.data ?? [])
        .map((r: any) => {
          const ex = r.exercise ?? {};
          const ov = overridesBySource.get(String(r.module_exercise_id));
          const removed = ov?.is_removed === true;
          if (removed) return null;

          const sets =
            ov?.sets_override ?? r.sets_override ?? ex.default_sets ?? 1;
          const reps =
            ov?.reps_override ?? r.reps_override ?? ex.default_reps ?? 1;

          return {
            id: String(r.module_exercise_id),
            kind: "template" as const,
            module_exercise_id: r.module_exercise_id,
            order_index: r.order_index,
            exercise_id: ex.exercise_id,
            title: ex.title ?? "",
            description: ex.description ?? null,
            thumbnail_url: ex.thumbnail_url ?? null,
            sets,
            reps,
            can_remove: true,
          };
        })
        .filter(Boolean);

      const additions = addedRows
        .map((r: any) => {
          const ex = r.exercise ?? {};
          const sets = r.sets_override ?? ex.default_sets ?? 1;
          const reps = r.reps_override ?? ex.default_reps ?? 1;
          return {
            id: String(r.user_assignment_exercise_id),
            kind: "added" as const,
            user_assignment_exercise_id: r.user_assignment_exercise_id,
            order_index: r.order_index ?? 999999,
            exercise_id: ex.exercise_id ?? r.exercise_id,
            title: ex.title ?? "",
            description: ex.description ?? null,
            thumbnail_url: ex.thumbnail_url ?? null,
            sets,
            reps,
            can_remove: true,
          };
        })
        .sort((a: any, b: any) => Number(a.order_index) - Number(b.order_index));

      const rows = [...templateRows, ...additions];

      return res.json({ module_id: moduleId, exercises: rows });
    } catch (error) {
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to fetch exercises",
      });
    }
  },
);

/** Overrides sets/reps for a template exercise row; optionally removes/restores it. */
router.patch(
  "/users/:userId/assignments/:assignmentId/sessions/:moduleId/exercises/:moduleExerciseId",
  async (req, res) => {
    try {
      const userId = String(req.params.userId || "").trim();
      const assignmentId = String(req.params.assignmentId || "").trim();
      const moduleId = Number(req.params.moduleId);
      const moduleExerciseId = Number(req.params.moduleExerciseId);
      if (
        !userId ||
        !assignmentId ||
        !Number.isFinite(moduleId) ||
        !Number.isFinite(moduleExerciseId)
      ) {
        return res.status(400).json({ error: "Invalid route parameters." });
      }

      const assignment = await getUserPackageAssignment(userId, assignmentId);
      if (!assignment) return res.status(404).json({ error: "Assignment not found." });

      const { sets, reps, removed } = req.body ?? {};
      const hasSets = sets !== undefined;
      const hasReps = reps !== undefined;
      const hasRemoved = removed !== undefined;
      if (!hasSets && !hasReps && !hasRemoved) {
        return res.status(400).json({ error: "No fields to update." });
      }

      const sets_override =
        sets === null || sets === undefined ? null : Math.max(1, Number(sets) || 1);
      const reps_override =
        reps === null || reps === undefined ? null : Math.max(1, Number(reps) || 1);
      const is_removed = removed === true;

      // Fetch the module_exercise to copy exercise_id for storage and validate module_id matches.
      const meRow = await supabaseServer
        .from("module_exercise")
        .select("module_exercise_id, module_id, exercise_id")
        .eq("module_exercise_id", moduleExerciseId)
        .maybeSingle();
      if (meRow.error) return res.status(500).json({ error: meRow.error.message });
      if (!meRow.data) return res.status(404).json({ error: "Module exercise not found." });
      if (Number((meRow.data as any).module_id) !== moduleId) {
        return res.status(400).json({ error: "Module mismatch." });
      }

      // Update existing override row if present; otherwise insert a new one.
      const existing = await supabaseServer
        .from("user_assignment_exercise")
        .select("user_assignment_exercise_id, sets_override, reps_override, is_removed")
        .eq("assignment_id", assignmentId)
        .eq("module_id", moduleId)
        .eq("source_module_exercise_id", moduleExerciseId)
        .maybeSingle();
      if (existing.error) return res.status(500).json({ error: existing.error.message });

      if (existing.data) {
        const patch: any = {};
        if (hasSets) patch.sets_override = sets_override;
        if (hasReps) patch.reps_override = reps_override;
        if (hasRemoved) patch.is_removed = is_removed;
        const upd = await supabaseServer
          .from("user_assignment_exercise")
          .update(patch)
          .eq("user_assignment_exercise_id", (existing.data as any).user_assignment_exercise_id)
          .select("user_assignment_exercise_id")
          .maybeSingle();
        if (upd.error) return res.status(500).json({ error: upd.error.message });
      } else {
        const ins: any = {
          user_id: userId,
          assignment_id: assignmentId,
          module_id: moduleId,
          source_module_exercise_id: moduleExerciseId,
          exercise_id: (meRow.data as any).exercise_id,
          is_removed: hasRemoved ? is_removed : false,
        };
        if (hasSets) ins.sets_override = sets_override;
        if (hasReps) ins.reps_override = reps_override;
        const insRes = await supabaseServer
          .from("user_assignment_exercise")
          .insert(ins)
          .select("user_assignment_exercise_id")
          .maybeSingle();
        if (insRes.error) return res.status(500).json({ error: insRes.error.message });
      }

      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to update exercise",
      });
    }
  },
);

/** Adds an extra exercise to this module for this assignment. */
router.post(
  "/users/:userId/assignments/:assignmentId/sessions/:moduleId/exercises",
  async (req, res) => {
    try {
      const userId = String(req.params.userId || "").trim();
      const assignmentId = String(req.params.assignmentId || "").trim();
      const moduleId = Number(req.params.moduleId);
      const exercise_id = Number(req.body?.exercise_id);
      if (
        !userId ||
        !assignmentId ||
        !Number.isFinite(moduleId) ||
        !Number.isFinite(exercise_id)
      ) {
        return res.status(400).json({ error: "Invalid parameters." });
      }

      const assignment = await getUserPackageAssignment(userId, assignmentId);
      if (!assignment) return res.status(404).json({ error: "Assignment not found." });

      const assignmentIdValue =
        /^\d+$/.test(assignmentId.trim()) ? Number(assignmentId) : assignmentId;

      // Ensure module is either in the template plan OR added for this assignment.
      const pmCheck = await supabaseServer
        .from("plan_module")
        .select("plan_module_id")
        .eq("plan_id", assignment.package_id)
        .eq("module_id", moduleId)
        .maybeSingle();
      if (pmCheck.error) return res.status(500).json({ error: pmCheck.error.message });
      if (!pmCheck.data) {
        const uasCheck = await supabaseServer
          .from("user_assignment_session")
          .select("user_assignment_session_id")
          .eq("assignment_id", assignmentIdValue as any)
          .eq("module_id", moduleId)
          .eq("user_id", userId)
          .eq("is_removed", false)
          .maybeSingle();
        if (uasCheck.error) return res.status(500).json({ error: uasCheck.error.message });
        if (!uasCheck.data) {
          return res.status(404).json({ error: "Module not found for assignment." });
        }
      }

      // If the exercise exists in the template for this module:
      // - If it's been removed for this assignment, "restore" it (set is_removed=false).
      // - Otherwise, it's already included; do not create a duplicate "added" row.
      const meDup = await supabaseServer
        .from("module_exercise")
        .select("module_exercise_id")
        .eq("module_id", moduleId)
        .eq("exercise_id", exercise_id)
        .maybeSingle();
      if (meDup.error) return res.status(500).json({ error: meDup.error.message });
      if (meDup.data) {
        const existingOverride = await supabaseServer
          .from("user_assignment_exercise")
          .select("user_assignment_exercise_id, is_removed")
          .eq("assignment_id", assignmentIdValue as any)
          .eq("module_id", moduleId)
          .eq("exercise_id", exercise_id)
          .eq("source_module_exercise_id", (meDup.data as any).module_exercise_id)
          .maybeSingle();
        if (existingOverride.error) {
          return res.status(500).json({ error: existingOverride.error.message });
        }
        if (existingOverride.data && (existingOverride.data as any).is_removed === true) {
          const restore = await supabaseServer
            .from("user_assignment_exercise")
            .update({ is_removed: false })
            .eq("user_assignment_exercise_id", (existingOverride.data as any).user_assignment_exercise_id);
          if (restore.error) return res.status(500).json({ error: restore.error.message });
          return res.status(200).json({ ok: true, restored_template: true });
        }
        return res.status(200).json({ ok: true, already_in_template: true });
      }

      // Prevent duplicates among added rows.
      const addDup = await supabaseServer
        .from("user_assignment_exercise")
        .select("user_assignment_exercise_id")
        .eq("assignment_id", assignmentIdValue as any)
        .eq("module_id", moduleId)
        .eq("exercise_id", exercise_id)
        .is("source_module_exercise_id", null)
        .maybeSingle();
      if (addDup.error) return res.status(500).json({ error: addDup.error.message });
      if (addDup.data) {
        return res.status(409).json({ error: "This exercise is already added to this session." });
      }

      // Compute next order_index among existing added exercises.
      const { data: existingAdds, error: addsErr } = await supabaseServer
        .from("user_assignment_exercise")
        .select("order_index")
        .eq("assignment_id", assignmentIdValue as any)
        .eq("module_id", moduleId)
        .is("source_module_exercise_id", null);
      if (addsErr) return res.status(500).json({ error: addsErr.message });
      const maxOrder = Math.max(
        0,
        ...((existingAdds ?? []).map((r: any) => Number(r.order_index) || 0)),
      );

      const insRes = await supabaseServer
        .from("user_assignment_exercise")
        .insert({
          user_id: userId,
          assignment_id: assignmentIdValue as any,
          module_id: moduleId,
          source_module_exercise_id: null,
          exercise_id,
          order_index: maxOrder + 1,
        })
        .select("user_assignment_exercise_id")
        .single();
      if (insRes.error) return res.status(500).json({ error: insRes.error.message });
      return res.status(201).json({ ok: true, id: insRes.data.user_assignment_exercise_id });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to add exercise",
      });
    }
  },
);

/** Removes an added exercise row (does not affect template). */
router.delete(
  "/users/:userId/assignments/:assignmentId/sessions/:moduleId/exercises/added/:userAssignmentExerciseId",
  async (req, res) => {
    try {
      const userId = String(req.params.userId || "").trim();
      const assignmentId = String(req.params.assignmentId || "").trim();
      const moduleId = Number(req.params.moduleId);
      const id = String(req.params.userAssignmentExerciseId || "").trim();
      if (!userId || !assignmentId || !Number.isFinite(moduleId) || !id) {
        return res.status(400).json({ error: "Invalid parameters." });
      }

      const delRes = await supabaseServer
        .from("user_assignment_exercise")
        .delete()
        .eq("user_assignment_exercise_id", id)
        .eq("assignment_id", assignmentId)
        .eq("module_id", moduleId)
        .eq("user_id", userId)
        .is("source_module_exercise_id", null)
        .select("user_assignment_exercise_id")
        .maybeSingle();
      if (delRes.error) return res.status(500).json({ error: delRes.error.message });
      if (!delRes.data) return res.status(404).json({ error: "Exercise row not found." });
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to remove exercise",
      });
    }
  },
);

/**
 * Materializes merged session order, sets start_date, marks layout published, bootstraps first patient unlock.
 * Used from Edit User after a deferred (draft) assignment.
 */
router.post(
  "/users/:userId/assignments/:assignmentId/publish-session-layout",
  async (req, res) => {
    try {
      const userId = String(req.params.userId || "").trim();
      const assignmentId = String(req.params.assignmentId || "").trim();
      const start_date = req.body?.start_date;
      if (!userId || !assignmentId) {
        return res.status(400).json({ error: "Missing userId or assignmentId." });
      }
      let startDate: string;
      try {
        startDate = parseAssignStartDate(start_date);
      } catch (e) {
        return res.status(400).json({
          error: e instanceof Error ? e.message : "Invalid start_date.",
        });
      }
      await materializeSessionLayoutAndPublish(userId, assignmentId, startDate);
      try {
        const tag = await clientTagForAuthUser(userId);
        const adminName = await adminDisplayNameFromReq(req);
        const patientName = await patientDisplayNameForAuthUser(userId);
        await logPlanAssignmentActivity(
          `[client:${tag}] ${adminName} published session layout (start ${startDate}) for ${patientName}`,
        );
      } catch {
        /* best-effort */
      }
      return res.json({ ok: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Publish failed.";
      if (msg.toLowerCase().includes("not found")) {
        return res.status(404).json({ error: msg });
      }
      return res.status(500).json({ error: msg });
    }
  },
);

/** Updates assignment metadata (currently start_date). */
router.patch("/users/:userId/assignments/:assignmentId", async (req, res) => {
  try {
    const userId = String(req.params.userId || "").trim();
    const assignmentId = String(req.params.assignmentId || "").trim();
    const start_date = req.body?.start_date;
    if (!userId || !assignmentId) {
      return res.status(400).json({ error: "Missing userId or assignmentId." });
    }
    if (typeof start_date !== "string" || !start_date.trim()) {
      return res.status(400).json({ error: "start_date is required." });
    }

    const { data, error } = await supabaseServer
      .from("user_packages")
      .update({ start_date: start_date.trim() })
      .eq("user_id", userId)
      .eq("id", assignmentId)
      .select("id")
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Assignment not found." });
    try {
      const tag = await clientTagForAuthUser(userId);
      const adminName = await adminDisplayNameFromReq(req);
      const patientName = await patientDisplayNameForAuthUser(userId);
      await logPlanAssignmentActivity(
        `[client:${tag}] ${adminName} set plan start date to ${start_date.trim()} for ${patientName}`,
      );
    } catch {
      /* best-effort log */
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to update assignment",
    });
  }
});

/** Deletes an assignment (removes plan from user). */
router.delete("/users/:userId/assignments/:assignmentId", async (req, res) => {
  try {
    const userId = String(req.params.userId || "").trim();
    const assignmentId = String(req.params.assignmentId || "").trim();
    if (!userId || !assignmentId) {
      return res.status(400).json({ error: "Missing userId or assignmentId." });
    }

    const delRes = await supabaseServer
      .from("user_packages")
      .delete()
      .eq("user_id", userId)
      .eq("id", assignmentId)
      .select("id")
      .maybeSingle();

    if (delRes.error) return res.status(500).json({ error: delRes.error.message });
    if (!delRes.data) return res.status(404).json({ error: "Assignment not found." });
    try {
      const tag = await clientTagForAuthUser(userId);
      const adminName = await adminDisplayNameFromReq(req);
      const patientName = await patientDisplayNameForAuthUser(userId);
      await logPlanAssignmentActivity(
        `[client:${tag}] ${adminName} removed plan assignment for ${patientName}`,
      );
    } catch {
      /* best-effort log */
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to delete assignment",
    });
  }
});

export default router;