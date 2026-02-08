import type { Request, Response, NextFunction } from 'express';
import type { User } from '@supabase/supabase-js';
import { supabaseServer } from './supabaseServer';

export type AuthedRequest = Request & {
  user?: User;
  accessToken?: string;
};

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate JWT with Supabase Auth
    const { data, error } = await supabaseServer.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = data.user;
    req.accessToken = token;
    return next();
  } catch (err) {
    console.error('requireAuth error:', err);
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

async function checkAdminPrivileges(user: User): Promise<boolean> {
  // 1) Check common JWT metadata patterns
  const appRole = (user.app_metadata as any)?.role;
  const userRole = (user.user_metadata as any)?.role;
  const isAdminFlag = (user.user_metadata as any)?.is_admin;

  if (appRole === 'admin' || userRole === 'admin' || isAdminFlag === true) {
    return true;
  }

  // 2) Optional DB fallback (adjust table/columns to your schema)
  // Common: profiles.id = auth.users.id, with role or is_admin columns
  try {
    const { data, error } = await supabaseServer
      .from('profiles')
      .select('role,is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (error) return false;

    const role = (data as any)?.role;
    const isAdmin = (data as any)?.is_admin;

    return role === 'admin' || isAdmin === true;
  } catch {
    // If profiles table doesn't exist, just treat as non-admin
    return false;
  }
}

export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  // First ensure authenticated
  await requireAuth(req, res, async () => {
    try {
      const user = req.user!;
      const isAdmin = await checkAdminPrivileges(user);

      if (!isAdmin) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      return next();
    } catch (err) {
      console.error('requireAdmin error:', err);
      return res.status(403).json({ message: 'Forbidden' });
    }
  });
}