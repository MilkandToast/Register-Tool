import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { CONFIG } from './config.js';

export const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// Every service uses this: returns the data, or throws a readable error.
export function unwrap({ data, error }) {
  if (error) throw new Error(friendlyMessage(error));
  return data;
}

function friendlyMessage(error) {
  if (error.code === '23505') return 'That record already exists.';
  if (error.code === '42501') return 'You do not have permission to do that.';
  return error.message || 'Something went wrong.';
}
