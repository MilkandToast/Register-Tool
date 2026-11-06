import { supabase, unwrap } from '../supabase-client.js';
import { todayISO, toDbTime } from '../utils/time.js';

// No 0/O or 1/I so codes are easy to read out loud
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCode(length = 6) {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

// Today's sessions as { [classId]: session }
export async function getTodaySessions() {
  const rows = unwrap(
    await supabase.from('sessions').select('*').eq('session_date', todayISO())
  );
  return Object.fromEntries(rows.map((s) => [s.class_id, s]));
}

// Create or update today's session for ONE class
export async function saveTodaySession({ classId, code, lateAfter, closesAt, isOpen = true }) {
  const res = await supabase
    .from('sessions')
    .upsert(
      {
        class_id: classId,
        session_date: todayISO(),
        code: code.trim().toUpperCase(),
        late_after: toDbTime(lateAfter),
        closes_at: toDbTime(closesAt),
        is_open: isOpen
      },
      { onConflict: 'class_id,session_date' }
    )
    .select()
    .single();

  if (res.error && res.error.code === '23505') {
    throw new Error('That code is already in use today. Generate a new one.');
  }
  return unwrap(res);
}

export async function setSessionOpen(sessionId, isOpen) {
  return unwrap(
    await supabase
      .from('sessions')
      .update({ is_open: isOpen })
      .eq('id', sessionId)
      .select()
      .single()
  );
}

// Also deletes that session's attendance records.
export async function deleteSession(sessionId) {
  unwrap(await supabase.from('sessions').delete().eq('id', sessionId));
}
