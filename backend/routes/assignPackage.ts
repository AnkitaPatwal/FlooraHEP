import { Router } from "express";
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

    return res.json(Array.isArray(data) ? data : []);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch modules",
    });
  }
});

router.post("/assign-package", async (req, res) => {
  try {
    const { user_id, package_id, start_date } = req.body;

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
      startDate
    );

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
      .select("id, package_id, start_date, created_at")
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
    }
  | null
> {
  const assignmentIdValue =
    /^\d+$/.test(assignmentId.trim()) ? Number(assignmentId) : assignmentId;
  const { data, error } = await supabaseServer
    .from("user_packages")
    .select("id, user_id, package_id, start_date, created_at")
    .eq("user_id", userId)
    .eq("id", assignmentIdValue as any)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: String((data as any).id),
    user_id: String((data as any).user_id),
    package_id: Number((data as any).package_id),
    start_date: (data as any).start_date ?? null,
    created_at: (data as any).created_at ?? null,
  };
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

      const base = {
        order_index: orderIndex,
        module_id: Number(row.module_id ?? mod.module_id),
        title: String(mod.title ?? ""),
        description: mod.description ?? null,
        session_number: mod.session_number ?? null,
        unlock_date: null as string | null,
      };
      if (removed) {
        templateExcluded.push({ ...base, is_unlocked: false });
      } else {
        templateIncluded.push({ ...base, is_unlocked: true });
      }
    }

    // Added sessions are always included; order_index after template.
    const addedIncluded = addedRows
      .map((r: any) => {
        const mod = (r.module?.[0] ?? r.module ?? {}) as any;
        return {
          order_index: Number(r.order_index ?? 999999),
          module_id: Number(r.module_id ?? mod.module_id),
          title: String(mod.title ?? ""),
          description: mod.description ?? null,
          session_number: mod.session_number ?? null,
          is_unlocked: true,
          unlock_date: null as string | null,
        };
      })
      .sort((a, b) => a.order_index - b.order_index);

    // Compute unlock dates based on *included* sequence for this assignment.
    const includedSequence = [...templateIncluded, ...addedIncluded].sort(
      (a, b) => a.order_index - b.order_index,
    );
    for (let i = 0; i < includedSequence.length; i++) {
      const s = includedSequence[i];
      s.unlock_date =
        typeof startDate === "string"
          ? addDaysUtc(startDate, i * 7)
          : null;
    }

    // Keep excluded available to add in dropdown.
    const sessions = [
      ...includedSequence,
      ...templateExcluded.sort((a, b) => a.order_index - b.order_index),
    ];

    return res.json({
      plan_id: assignment.package_id,
      plan_title: planRes.data?.title ?? "",
      start_date: assignment.start_date,
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

    const assignment = await getUserPackageAssignment(userId, assignmentId);
    if (!assignment) return res.status(404).json({ error: "Assignment not found." });

    // If module is in template, ensure it's not currently included and instead "restore" by writing override row is_removed=false.
    const pm = await supabaseServer
      .from("plan_module")
      .select("plan_module_id, order_index, module_id")
      .eq("plan_id", assignment.package_id)
      .eq("module_id", moduleId)
      .maybeSingle();
    if (pm.error) return res.status(500).json({ error: pm.error.message });

    if (pm.data) {
      // Create/update override row to ensure it's not removed.
      const existing = await supabaseServer
        .from("user_assignment_session")
        .select("user_assignment_session_id")
        .eq("assignment_id", /^\d+$/.test(assignmentId) ? Number(assignmentId) : assignmentId)
        .eq("source_plan_module_id", (pm.data as any).plan_module_id)
        .maybeSingle();
      if (existing.error) return res.status(500).json({ error: existing.error.message });

      if (existing.data) {
        const upd = await supabaseServer
          .from("user_assignment_session")
          .update({ is_removed: false })
          .eq("user_assignment_session_id", (existing.data as any).user_assignment_session_id);
        if (upd.error) return res.status(500).json({ error: upd.error.message });
      } else {
        const ins = await supabaseServer.from("user_assignment_session").insert({
          user_id: userId,
          assignment_id: /^\d+$/.test(assignmentId) ? Number(assignmentId) : assignmentId,
          module_id: moduleId,
          source_plan_module_id: (pm.data as any).plan_module_id,
          is_removed: false,
        });
        if (ins.error) return res.status(500).json({ error: ins.error.message });
      }
      return res.status(201).json({ ok: true });
    }

    // Extra session (module not in template): prevent duplicates.
    const dup = await supabaseServer
      .from("user_assignment_session")
      .select("user_assignment_session_id")
      .eq("assignment_id", /^\d+$/.test(assignmentId) ? Number(assignmentId) : assignmentId)
      .eq("module_id", moduleId)
      .is("source_plan_module_id", null)
      .maybeSingle();
    if (dup.error) return res.status(500).json({ error: dup.error.message });
    if (dup.data) return res.status(409).json({ error: "Session already added." });

    const { data: existingAdds, error: addsErr } = await supabaseServer
      .from("user_assignment_session")
      .select("order_index")
      .eq("assignment_id", /^\d+$/.test(assignmentId) ? Number(assignmentId) : assignmentId)
      .is("source_plan_module_id", null);
    if (addsErr) return res.status(500).json({ error: addsErr.message });
    const maxOrder = Math.max(
      0,
      ...((existingAdds ?? []).map((r: any) => Number(r.order_index) || 0)),
    );

    const ins = await supabaseServer.from("user_assignment_session").insert({
      user_id: userId,
      assignment_id: /^\d+$/.test(assignmentId) ? Number(assignmentId) : assignmentId,
      module_id: moduleId,
      source_plan_module_id: null,
      order_index: maxOrder + 1,
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

      // Validate module is part of the plan for this assignment.
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
        return res
          .status(404)
          .json({ error: "Module not found for this assignment." });
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
            default_sets,
            default_reps
          )
        `,
        )
        .eq("assignment_id", assignmentId)
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

      // Ensure module belongs to plan.
      const pmCheck = await supabaseServer
        .from("plan_module")
        .select("plan_module_id")
        .eq("plan_id", assignment.package_id)
        .eq("module_id", moduleId)
        .maybeSingle();
      if (pmCheck.error) return res.status(500).json({ error: pmCheck.error.message });
      if (!pmCheck.data) return res.status(404).json({ error: "Module not found for assignment." });

      // Prevent duplicates: if exercise already exists in template for this module, don't add again.
      const meDup = await supabaseServer
        .from("module_exercise")
        .select("module_exercise_id")
        .eq("module_id", moduleId)
        .eq("exercise_id", exercise_id)
        .maybeSingle();
      if (meDup.error) return res.status(500).json({ error: meDup.error.message });
      if (meDup.data) {
        return res.status(409).json({ error: "This exercise is already in the session template." });
      }

      // Prevent duplicates among added rows.
      const addDup = await supabaseServer
        .from("user_assignment_exercise")
        .select("user_assignment_exercise_id")
        .eq("assignment_id", assignmentId)
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
        .eq("assignment_id", assignmentId)
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
          assignment_id: assignmentId,
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
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to delete assignment",
    });
  }
});

export default router;