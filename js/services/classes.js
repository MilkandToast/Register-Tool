import { supabase, unwrap } from '../supabase-client.js';

export async function listClasses() {
  return unwrap(await supabase.from('classes').select('*').order('name'));
}

export async function addClass(name) {
  return unwrap(
    await supabase.from('classes').insert({ name: name.trim() }).select().single()
  );
}

export async function renameClass(id, name) {
  return unwrap(
    await supabase.from('classes').update({ name: name.trim() }).eq('id', id).select().single()
  );
}

// WARNING: also deletes that class's learners, sessions and attendance.
export async function deleteClass(id) {
  unwrap(await supabase.from('classes').delete().eq('id', id));
}
