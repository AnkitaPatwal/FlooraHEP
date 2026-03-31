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

export default router;