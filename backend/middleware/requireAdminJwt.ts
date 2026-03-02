import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AdminJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export function requireAdminJwt(req: Request, res: Response, next: NextFunction) {

  const authHeader = String(req.header("Authorization") || "");
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, error: "Missing authorization token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string);
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }
}