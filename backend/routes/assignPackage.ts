import { Router } from "express";
import { supabaseServer } from "../lib/supabaseServer";
import { requireAdminCookie } from "../middleware/requireAdminCookie";
import {
  getAssignableUsers,
  getAssignablePlans,
  assignPackageToUser,
  parseAssignStartDate,
} from "../services/relationshipService";

const router = Router();

router.use(requireAdminCookie);

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
 * ATH-423: PATCH /unlock-date — Edit unlock date per session (client-scoped override).
 * Validation: returns 400 if user_id, module_id, or unlock_date is missing.
 */
router.patch("/unlock-date", async (req, res) => {
  const { user_id, module_id, unlock_date } = req.body ?? {};
  if (!user_id || !module_id || !unlock_date) {
    return res.status(400).json({
      error: "user_id, module_id, and unlock_date are required",
    });
  }
  // TODO ATH-423: persist unlock date override for this client
  return res.status(200).json({ ok: true, user_id, module_id, unlock_date });
});

/**
 * ATH-423: DELETE /client-session — Remove a session for this client only (template unchanged).
 * Validation: returns 400 if user_id or module_id is missing.
 */
router.delete("/client-session", async (req, res) => {
  const { user_id, module_id } = req.body ?? {};
  if (!user_id || !module_id) {
    return res.status(400).json({
      error: "user_id and module_id are required",
    });
  }
  // TODO ATH-423: remove/hide session for this client only
  return res.status(200).json({ ok: true });
});

/**
 * ATH-423: DELETE /unassign — Unassign plan for this client only.
 * Validation: returns 400 if user_id is missing.
 */
router.delete("/unassign", async (req, res) => {
  const { user_id } = req.body ?? {};
  if (!user_id) {
    return res.status(400).json({
      error: "user_id is required",
    });
  }
  // TODO ATH-423: remove user_packages row and client-scoped unlock/session rows
  return res.status(200).json({ ok: true });
});

export default router;