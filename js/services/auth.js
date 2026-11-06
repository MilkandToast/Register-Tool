import { supabase, unwrap } from '../supabase-client.js';

export async function signIn(email, password) {
  if (!email || !password) throw new Error('Email and password are required.');
  return unwrap(await supabase.auth.signInWithPassword({ email, password }));
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

// Returns { user, profile } for a signed-in admin.
// Returns null if nobody is signed in OR the user has no admin profile.
export async function getCurrentAdmin() {
  const { data } = await supabase.auth.getSession();
  const session = data && data.session;
  if (!session) return null;

  const profile = unwrap(
    await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', session.user.id)
      .maybeSingle()
  );

  if (!profile) return null;
  return { user: session.user, profile };
}

export function isSuperAdmin(admin) {
  return !!admin && admin.profile.role === 'super_admin';
}
