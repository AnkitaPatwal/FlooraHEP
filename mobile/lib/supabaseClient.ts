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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
