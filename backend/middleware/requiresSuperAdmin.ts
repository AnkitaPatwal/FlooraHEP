import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AdminJwtPayload } from "./requireAdminJwt";

export function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = String(req.header("Authorization") || "");
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ ok: false, error: "Missing authorization token" });
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as AdminJwtPayload;

    if (payload.role !== "super_admin") {
      return res.status(403).json({
        ok: false,
        error: "Forbidden: super_admin role required",
      });
    }

    // Attach payload to request for use in route handlers
    (req as any).adminPayload = payload;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ ok: false, error: "Invalid or expired token" });
  }
}