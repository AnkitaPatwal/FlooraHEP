import { Router } from "express";
import { supabaseServer } from "../lib/supabaseServer";
import {
  getAssignableUsers,
  getAssignablePlans,
  assignPackageToUser,
} from "../services/relationshipService";

const router = Router();

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
    const { user_id, package_id } = req.body;

    if (!user_id || !package_id) {
      return res.status(400).json({
        error: "Please select both user and package.",
      });
    }

    const result = await assignPackageToUser(
      supabaseServer,
      String(user_id),
      Number(package_id)
    );

    return res.json(result);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to assign package",
    });
  }
});

export default router;