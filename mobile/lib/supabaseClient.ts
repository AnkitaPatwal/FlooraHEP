import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// During web SSR, window is undefined - use no-op storage to avoid crash.
// AsyncStorage uses window.localStorage on web, which breaks in Node.js.
const storage =
  Platform.OS === 'web' && typeof window === 'undefined'
    ? {
        getItem: async () => null,
        setItem: async () => {},
        removeItem: async () => {},
      }
    : AsyncStorage;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/** Tunnel/LTE can leave PostgREST requests open forever; cap wait so UI can recover. */
const SUPABASE_FETCH_TIMEOUT_MS = 22_000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), SUPABASE_FETCH_TIMEOUT_MS);

  const parent = init?.signal;
  const onParentAbort = () => ac.abort();
  if (parent) {
    if (parent.aborted) {
      clearTimeout(timer);
      return Promise.reject(parent.reason ?? new DOMException("Aborted", "AbortError"));
    }
    parent.addEventListener("abort", onParentAbort, { once: true });
  }

  return fetch(input, { ...init, signal: ac.signal }).finally(() => {
    clearTimeout(timer);
    if (parent) parent.removeEventListener("abort", onParentAbort);
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetchWithTimeout,
  },
});