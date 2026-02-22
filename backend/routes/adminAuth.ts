import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.LOCAL_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.LOCAL_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error(
    'supabaseUrl is required. Set NEXT_PUBLIC_SUPABASE_URL or LOCAL_SUPABASE_URL in backend/.env'
  );
}

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    'supabaseAnonKey is required. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or LOCAL_SUPABASE_ANON_KEY in backend/.env'
  );
}

// Public (anon) Supabase client for login
const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  // Dev bypass: when DISABLE_ADMIN_GUARD is set, allow sign-in with password "bypass" (no real Supabase auth)
  const bypassEnabled = /^(true|1)$/i.test(String(process.env.DISABLE_ADMIN_GUARD ?? '').trim());
  const isBypassPassword = password.trim().toLowerCase() === 'bypass';
  if (bypassEnabled && isBypassPassword) {
    console.log('Dev bypass login used for', email.trim());
    return res.status(200).json({
      access_token: 'dev-bypass-token',
      user: { id: 'dev-bypass', email: email.trim() },
    });
  }

  try {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session?.access_token) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.status(200).json({
      access_token: data.session.access_token,
      user: data.user,
    });
  } catch (err) {
    console.error('admin login error:', err);
    return res.status(500).json({ message: 'Login failed.' });
  }
});

export default router;
