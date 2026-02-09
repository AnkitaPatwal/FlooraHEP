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


 /* 
 - Requests without authentication return 401 Unauthorized.
 - Backend validates that the request is authenticated.
 */
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

async function isUserAdminByTable(user: User): Promise<boolean> {
  // Your migration defines admin_users keyed by email + is_active
  const email = user.email?.toLowerCase().trim();
  if (!email) return false;

  // This query must run with your SERVICE ROLE client (supabaseServer should be created with SUPABASE_SERVICE_ROLE_KEY)
  // because your RLS + grants revoke anon/authenticated access to admin_users.
  const { data, error } = await supabaseServer
    .from('admin_users')
    .select('email,is_active')
    .eq('email', email)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('admin_users lookup error:', error);
    return false;
  }

  return !!data;
}

/*
 - Backend checks that the authenticated user has admin privileges.
 - Requests from authenticated non-admin users return 403 Forbidden.
 - Admin routes are protected using this logic.
 */
export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  // First ensure authenticated
  await requireAuth(req, res, async () => {
    try {
      const user = req.user!;
      const isAdmin = await isUserAdminByTable(user);

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
