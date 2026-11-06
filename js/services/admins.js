// Super admin only. Creating and removing accounts goes through the secure `create-admin` function (built in step 5), because that needs a private key that must never be in the browser.

import { supabase, unwrap } from '../supabase-client.js';

export async function listAdmins() {
  return unwrap(
    await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .order('created_at')
  );
}

async function callFunction(body) {
  const { data, error } = await supabase.functions.invoke('create-admin', { body });
  if (error) {
    let message = error.message;
    try {
      const details = await error.context.json();
      if (details && details.error) message = details.error;
    } catch (_) {
      /* keep the default message */
    }
    throw new Error(message);
  }
  return data;
}

export function createAdmin({ fullName, email, password }) {
  return callFunction({ action: 'create', fullName, email, password });
}

export function removeAdmin(userId) {
  return callFunction({ action: 'remove', userId });
}
