import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/*
 * Cookie-based admin auth (same as /api/admin routes after login).
 * Expects `admin_token` httpOnly cookie signed with ADMIN_JWT_SECRET.
 */
export function requireAdminCookie(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const adminJwtSecret = process.env.ADMIN_JWT_SECRET;
  if (!adminJwtSecret) {
    return res.status(500).json({ ok: false, error: "Server misconfiguration" });
  }

  const token = (req as Request & { cookies?: { admin_token?: string } }).cookies
    ?.admin_token;

  if (!token) {
    return res.status(401).json({ ok: false, error: "Missing authorization token" });
  }

  try {
    const payload = jwt.verify(token, adminJwtSecret) as Record<string, unknown>;
    (req as Request & { admin?: unknown }).admin = payload;
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }
}
